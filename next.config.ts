import { createNextConfig } from '@eilon-shai/venture-core/utils';

export default createNextConfig({
  extraImageHosts: ['images.unsplash.com'],
  extraScriptSrc: ['https://sandbox-cdn.paddle.com', 'https://cdn.paddle.com', 'https://vercel.live'],
  extraStyleSrc: ['https://sandbox-cdn.paddle.com', 'https://cdn.paddle.com'],
  extraFrameSrc: [
    'https://sandbox-buy.paddle.com',
    'https://sandbox-checkout.paddle.com',
    'https://buy.paddle.com',
    'https://checkout.paddle.com',
  ],
});
