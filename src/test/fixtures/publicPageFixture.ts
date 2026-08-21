export const validPublicPageResponse = {
  data: {
    page: {
      id: "813876e5-42d8-4fbb-91ea-72223a3bc990",
      slug: "home",
      title: "Home",
      seo_title: "SPA Saxophone Ensemble",
      seo_description: "World-class musical performances",
      seo_keywords: ["saxophone", "ensemble", "music"],
    },
    sections: [
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df322",
        key: "about-us",
        title: "About Us",
        navigation_label: "About Us",
        sort_order: 10,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d19",
            block_type: "text",
            title: "Who We Are",
            text: "SPA Saxophone Ensemble delivers world-class musical performances.",
            media: null,
            sort_order: 10,
          },
          {
            id: "b2c3d4e5-f6a7-48b9-0123-456789abcdef",
            block_type: "text_image",
            title: "Ensemble Photo",
            text: "Our team on stage.",
            media: {
              type: "image",
              id: "99887766-5544-3322-1100-aabbccddeeff",
              url: "/uploads/stage.jpg",
              alt_text: "Ensemble on stage",
            },
            sort_order: 20,
          },
          {
            id: "c3d4e5f6-a7b8-49c0-1234-56789abcdef0",
            block_type: "text_video",
            title: "Concert Clip",
            text: "Watch our recent performance.",
            media: {
              type: "video",
              id: "88776655-4433-2211-0099-bbccddeeff00",
              url: "/uploads/performance.mp4",
              mime_type: "video/mp4",
            },
            sort_order: 30,
          },
          {
            id: "d4e5f6a7-b8c9-40d1-2345-6789abcdef01",
            block_type: "text_youtube",
            title: "YouTube Feature",
            text: "Official music video.",
            media: {
              type: "youtube",
              id: "77665544-3322-1100-9988-ccddeeff0011",
              youtube_video_id: "dQw4w9WgXcQ",
              embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              thumbnail_url:
                "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            },
            sort_order: 40,
          },
        ],
      },
    ],
  },
};
