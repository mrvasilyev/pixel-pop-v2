import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
    storage: import.meta.env.PROD
        ? {
            kind: 'github',
            repo: 'mrvasilyev/pixel-pop-v2',
        }
        : {
            kind: 'local',
        },
    ui: {
        brand: { name: 'Pixel Pop' },
    },
    singletons: {
        header: singleton({
            label: 'Main Header',
            path: 'src/content/header',
            format: { data: 'json' },
            schema: {
                title: fields.text({ label: 'Title' }),
                logo: fields.image({
                    label: 'Logo',
                    directory: 'public/images/header',
                    publicPath: '/images/header/',
                }),
                background: fields.image({
                    label: 'App Background',
                    directory: 'public/images/background',
                    publicPath: '/images/background/',
                }),
            },
        }),
    },
    collections: {
        styles: collection({
            label: 'Try a Style',
            slugField: 'title',
            path: 'src/content/styles/*',
            format: 'json',
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                cover: fields.image({
                    label: 'Cover Image',
                    directory: 'public/images/styles',
                    publicPath: '/images/styles/',
                }),
                prompt: fields.text({ label: 'Prompt (API)', multiline: true }),
                order: fields.integer({ label: 'Sort Order', defaultValue: 0 }),
                content: fields.markdoc({ label: 'Description' }),
            },
        }),
        discover: collection({
            label: 'Discover New',
            slugField: 'title',
            path: 'src/content/discover/*',
            format: 'json',
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                cover: fields.image({
                    label: 'Cover Image',
                    directory: 'public/images/discover',
                    publicPath: '/images/discover/',
                }),
                prompt: fields.text({ label: 'Prompt (API)', multiline: true }),
                order: fields.integer({ label: 'Sort Order', defaultValue: 0 }),
                content: fields.markdoc({ label: 'Description' }),
            },
        }),
    },
});
