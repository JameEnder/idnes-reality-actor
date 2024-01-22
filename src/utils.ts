import { Input } from './main.js';

type CreateUrlInfo = Pick<
    Input,
    'propertyType' | 'dealType' | 'minPrice' | 'maxPrice' | 'minSize' | 'maxSize' | 'location'
>

export const createUrl = (
    { propertyType, dealType, minPrice, maxPrice, minSize, maxSize, location }: CreateUrlInfo,
) => {
    let dealPostfix;

    if (dealType === 'rent') {
        dealPostfix = 'pronajem/';
    } else if (dealType === 'buy') {
        dealPostfix = 'prodej/';
    }

    let propertyPostfix;

    if (propertyType === 'house') {
        propertyPostfix = 'domy/';
    } else if (propertyType === 'apartment') {
        propertyPostfix = 'byty/';
    }

    const params = new URLSearchParams();

    if (minPrice !== undefined) {
        params.set('s-qc[priceMin]', minPrice.toString());
    }

    if (maxPrice !== undefined) {
        params.set('s-qc[priceMax]', maxPrice.toString());
    }

    if (minSize !== undefined) {
        params.set('s-qc[usableAreaMin]', minSize.toString());
    }

    if (maxSize !== undefined) {
        params.set('s-qc[usableAreaMax]', maxSize.toString());
    }

    return `https://reality.idnes.cz/s/${dealPostfix || ''}${propertyPostfix || ''}${location}${params ? `?${params}` : ''}`;
};

export const infoFromTitle = (title: string): {
    propertyTypeView: string
    dealTypeView: string
} => {
    const formatted = title.toLocaleLowerCase();
    const splitted = formatted.split(' ');

    const info = {
        dealTypeView: splitted[0],
        propertyTypeView: splitted[1],
    };

    if (formatted.includes('bytu')) {
        info.propertyTypeView = 'Byt';
    } else if (formatted.includes('domu')) {
        info.propertyTypeView = 'Dům';
    } else if (formatted.includes('kanceláře')) {
        info.propertyTypeView = 'Kancelář';
    } else if (formatted.includes('garážového stání')) {
        info.propertyTypeView = 'Garážové stání';
    } else if (formatted.includes('restaurace')) {
        info.propertyTypeView = 'Restaurace';
    } else if (formatted.includes('obchodních prostor')) {
        info.propertyTypeView = 'Obchodní prostor';
    } else if (formatted.includes('skladovacích prostor')) {
        info.propertyTypeView = 'Skladovací prostor';
    } else if (formatted.includes('sklepní kóje')) {
        info.propertyTypeView = 'Sklepní kój';
    } else if (formatted.includes('komerčního pozemku')) {
        info.propertyTypeView = 'Komerční pozemek';
    }

    if (formatted.includes('prodej')) {
        info.dealTypeView = 'Prodej';
    } else if (formatted.includes('pronájem')) {
        info.dealTypeView = 'Pronájem';
    } else if (formatted.includes('dražba')) {
        info.dealTypeView = 'Dražba';
    }

    return info;
};
