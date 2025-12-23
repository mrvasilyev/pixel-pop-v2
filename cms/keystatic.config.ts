import { config, fields, collection, singleton } from '@keystatic/core';

const basePath = (import.meta.env?.PROD) ? 'frontend/' : '';

export default config({
    storage: (import.meta.env?.PROD)
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
            label: 'Main',
            path: `${basePath}src/content/header`,
            format: { data: 'json' },
            schema: {
                title: fields.text({ label: 'Title' }),
                ctaButtonText: fields.text({ label: 'Button Title' }),
                specialPrompt: fields.text({ label: 'Special Prompt', multiline: true }),
                logo: fields.image({
                    label: 'Logo',
                    directory: `${basePath}public/images/header`,
                    publicPath: '/images/header/',
                }),
                loadingPhrases: fields.array(fields.text({ label: 'Phrase' }), {
                    label: 'Loading Phrases',
                    itemLabel: props => props.value
                }),
                background: fields.image({
                    label: 'App Background',
                    directory: `${basePath}public/images/background`,
                    publicPath: '/images/background/',
                }),
            },
        }),
    },
    collections: {
        styles: collection({
            label: 'Try a Style',
            slugField: 'title',
            path: `${basePath}src/content/styles/*`,
            format: 'json',
            columns: ['title', 'order', 'hasPrompt'],
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                cover: fields.image({
                    label: 'Cover Image',
                    directory: `${basePath}public/images/styles`,
                    publicPath: '/images/styles/',
                }),
                prompt: fields.text({ label: 'Prompt (API)', multiline: true }),
                order: fields.integer({ label: 'Sort Order', defaultValue: 0 }),
                hasPrompt: fields.checkbox({ label: 'Prompt Ready', defaultValue: false }),
                content: fields.markdoc({ label: 'Description' }),
            },
        }),
        discover: collection({
            label: 'Discover New',
            slugField: 'title',
            path: `${basePath}src/content/discover/*`,
            format: 'json',
            columns: ['title', 'order', 'hasPrompt'],
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                cover: fields.image({
                    label: 'Cover Image',
                    directory: `${basePath}public/images/discover`,
                    publicPath: '/images/discover/',
                }),
                prompt: fields.text({ label: 'Prompt (API)', multiline: true }),
                order: fields.integer({ label: 'Sort Order', defaultValue: 0 }),
                hasPrompt: fields.checkbox({ label: 'Prompt Ready', defaultValue: false }),
                content: fields.markdoc({ label: 'Description' }),
            },
        }),
    },
});
