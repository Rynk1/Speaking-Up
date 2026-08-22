import { SocialPlatform, PlatformCapabilities } from './types';

export const PLATFORM_CAPABILITIES: Record<SocialPlatform, PlatformCapabilities> = {
  whatsapp: {
    platform: 'whatsapp',
    displayName: 'WhatsApp Chat',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: false,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['1:1', '16:9']
  },
  whatsapp_status: {
    platform: 'whatsapp_status',
    displayName: 'WhatsApp Status (9:16 Visual)',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: true,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['9:16']
  },
  youtube: {
    platform: 'youtube',
    displayName: 'YouTube Creator Pack',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: false,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['16:9', '9:16']
  },
  tiktok: {
    platform: 'tiktok',
    displayName: 'TikTok Video Pack',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: false,
    supportsThread: false,
    supportsDirectPublish: true, // TikTok Content Posting API / Share Kit ready
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['9:16']
  },
  instagram: {
    platform: 'instagram',
    displayName: 'Instagram (Feed & Story)',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: true,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: false,
    urlPrefill: false,
    aspectRatios: ['1:1', '4:5', '9:16']
  },
  x: {
    platform: 'x',
    displayName: 'X (Twitter)',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: false,
    supportsThread: true,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['16:9', '1:1'],
    maxCharacterLimit: 280
  },
  facebook: {
    platform: 'facebook',
    displayName: 'Facebook Feed',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: true,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['16:9', '1:1']
  },
  facebook_group: {
    platform: 'facebook_group',
    displayName: 'Facebook Group Discussion',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: false,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['16:9', '1:1']
  },
  blog: {
    platform: 'blog',
    displayName: 'Blog & News Press Kit',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: false,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['16:9', '1:1']
  },
  telegram: {
    platform: 'telegram',
    displayName: 'Telegram Channel',
    supportsImage: true,
    supportsVideo: true,
    supportsStory: false,
    supportsThread: false,
    supportsDirectPublish: false,
    captionPrefill: true,
    urlPrefill: true,
    aspectRatios: ['16:9', '1:1']
  }
};

export function getPlatformCapabilities(platform: SocialPlatform): PlatformCapabilities {
  return PLATFORM_CAPABILITIES[platform] || PLATFORM_CAPABILITIES['whatsapp'];
}
