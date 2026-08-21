import { describe, it, expect } from "vitest";
import { publicApi } from "../api/publicApi";

describe("Public API Integration", () => {
  it("fetches GET /api/v1/public/page and returns parsed grouped data via MSW", async () => {
    const data = await publicApi.getPublicPage();
    expect(data.page.slug).toBe("home");
    expect(data.page.title).toBe("Home");
    expect(data.sections).toHaveLength(1);

    const section = data.sections[0];
    expect(section?.key).toBe("about-us");
    expect(section?.navigation_label).toBe("About Us");
    expect(section?.blocks).toHaveLength(4);
  });
});
