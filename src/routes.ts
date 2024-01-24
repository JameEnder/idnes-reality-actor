import { createCheerioRouter, Dataset, useState } from 'crawlee';
import { labels } from './constants.js';
import { createUrl, infoFromTitle } from './utils.js';
import { Input } from './main.js';

export const router = createCheerioRouter();

const numberOfPropertiesQueued = await useState('numberOfPropertiesQueued', {
    value: 0,
});

// I like this format, as it makes it easy for the developer to see
// which handlers are implemented with the typehints.
type RouteUserData = {
    LOCATION: Input

    LIST: RouteUserData['LOCATION']

    OFFER: {
        data: {
            id: string
            address: string
        }
    } & RouteUserData['LIST']
}

router.addHandler<RouteUserData['LOCATION']>(labels.LOCATION, async ({ log, crawler, request, json }) => {
    const { location } = request.userData;

    if (json.length === 0 || !json[0].name_id) {
        log.error(`Location ${location} couldn't be found.`);
        return;
    }

    const firstLocationFound = json[0];

    log.info(`Found location '${firstLocationFound.name_rich}'`);

    let actualLocation = firstLocationFound.name_id
        .split(' ')
        .map((word: string) => word
            .toLocaleLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''))
        .join('-');

    if (actualLocation === 'hlavni-mesto-praha') {
        actualLocation = 'praha';
    }

    const startingURL = createUrl({ ...request.userData, location: actualLocation });

    await crawler.addRequests([{
        url: startingURL,
        label: labels.LIST,
        userData: request.userData,
    }]);
});

router.addHandler<RouteUserData['LIST']>(labels.LIST, async ({ log, $, crawler, request }) => {
    const { maxResults } = request.userData;

    const productsElement = $('.c-products__inner');

    const productRequests = [];

    for (const productElement of productsElement) {
        if (numberOfPropertiesQueued.value >= maxResults) continue;

        const element = $(productElement);

        const title = element.find('.c-products__title').text().trim().replace('\n', ' ');
        const address = element.find('.c-products__info').text().trim();
        const url = element.find('.c-products__link').attr('href');

        if (!url) {
            log.info(`Couldnt find url, skipping.. title: ${title}`);
            continue;
        }

        const splitUrl = url.split('/');
        const id = splitUrl[splitUrl.length - 2];

        productRequests.push(
            {
                url,
                label: 'OFFER',
                userData: {
                    ...request.userData,
                    data: {
                        id,
                        address,
                    },
                },
            },
        );

        numberOfPropertiesQueued.value += 1;
    }

    await crawler.addRequests(productRequests);

    const nextPageElement = $('.paging__item.next');

    if (nextPageElement && nextPageElement.attr('href') && numberOfPropertiesQueued.value < maxResults) {
        await crawler.addRequests([
            {
                url: `https://reality.idnes.cz${nextPageElement.attr('href')}`,
                label: labels.LIST,
                userData: request.userData,
            },
        ]);
    }
});

router.addHandler<RouteUserData['OFFER']>(labels.OFFER, async ({ log, $, request }) => {
    const { includeSellerInfo } = request.userData;
    const { id, address } = request.userData.data;

    // eslint-disable-next-line no-irregular-whitespace
    const nicerTitle = $('.b-detail__title').text().trim().replace(/ /g, ' ');

    log.info(`Processing '${nicerTitle}'`);

    const thumbnails = $('.b-gallery').find('img');

    const firstThumbnailUrl = thumbnails.first().attr('src');

    const tableRows = $('.b-definition-columns').find('dl').find('dt');
    const table: Record<string, string> = {};

    for (const heading of tableRows) {
        const key = $(heading).text().trim();
        const value = $(heading).next();

        if (key.includes('advertisement') || key.includes('Fixní ceny energií')) continue;

        const checkIcon = value.find('.icon.icon--check');

        if (checkIcon.length !== 0) {
            table[key] = 'Ano';
        } else {
            table[key] = value.text().trim();
        }
    }

    table.Cena = table.Cena?.replace('Spočítat hypotéku', '').trim();

    const sellerInfoElement = $('#f-contact');

    const sellerName = sellerInfoElement.find('.b-author__title').text().trim();
    const sellerLink = sellerInfoElement.find('.b-author__title').find('a').attr('href');

    let sellerId;

    if (sellerLink) {
        const sellerLinkSplit = sellerLink.split('/');
        sellerId = sellerLinkSplit[sellerLinkSplit.length - 2];
    }

    const seller = includeSellerInfo ? {
        Jméno: sellerName,
        ID: sellerId,
    } : undefined;

    const description = $('.b-desc>p').text().trim();

    const propertyTypes = infoFromTitle(nicerTitle);

    await Dataset.pushData({
        id,
        nazev: nicerTitle,
        lokace: address,
        typNemovitosti: propertyTypes.propertyTypeView,
        typVymeny: propertyTypes.dealTypeView,
        nahled: firstThumbnailUrl,
        podrobnosti: table,
        prodejce: seller,
        popis: description,
    });
});
