export const labels = {
    LOCATION: 'LOCATION',
    LIST: 'LIST',
    OFFER: 'OFFER',
} as const;

export type DealType = 'rent' | 'buy' | 'all'
export type PropertyType = 'apartment' | 'house' | 'other' | 'all'
