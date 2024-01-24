import { Actor } from 'apify';
import { CheerioCrawler, log } from 'crawlee';
import { labels, DealType, PropertyType } from './constants.js';
import { router } from './routes.js';

export interface Input {
    location: string;
    maxResults: number;
    dealType: DealType
    propertyType: PropertyType
    minSize?: number
    maxSize?: number
    minPrice?: number
    maxPrice?: number
    includeSellerInfo: boolean
}

await Actor.init();

const input = (await Actor.getInput<Input>())!;

const {
    location,
    maxResults = 100,
    dealType = 'all',
    propertyType = 'all',
    minSize,
    maxSize,
    minPrice,
    maxPrice,
    includeSellerInfo = false,
} = input;

const proxyConfiguration = await Actor.createProxyConfiguration();

const crawler = new CheerioCrawler({
    proxyConfiguration,
    requestHandler: router,
});

await crawler.addRequests([
    {
        label: labels.LOCATION,
        url: `https://reality.idnes.cz/admin.api/autocomplete-locality?types%5B0%5D=VUSC&types%5B1%5D=OKRES&types%5B2%5D=OBEC&types%5B3%5D=MOP&types%5B4%5D=SPRAVNI_OBVOD&types%5B5%5D=CAST_OBCE&types%5B6%5D=ULICE&types%5B7%5D=STAT&string=${location.toLocaleLowerCase()}`,
        userData: {
            location,
            maxResults,
            dealType,
            propertyType,
            minSize,
            maxSize,
            minPrice,
            maxPrice,
            includeSellerInfo,
        },
    },
]);

log.info('Starting the crawl.');
await crawler.run();
log.info('Crawl finished.');

await Actor.exit();
