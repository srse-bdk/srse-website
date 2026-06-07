import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type { Video, VideoInput } from "@/lib/types/video.type";

class VideoService {
  /**
   * Create a new video
   */
  async create(data: VideoInput): Promise<string> {
    const nowISO = new Date().toISOString();

    const videoData = {
      ...data,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const videoId = await mutate({
      action: "createWithId",
      path: "videos",
      data: videoData,
      actionBy: "admin",
    });

    return videoId;
  }

  /**
   * Get all videos
   */
  async getAll(): Promise<Video[]> {
    const data = await mutate({
      action: "get",
      path: "videos",
    });
    return getArrFromObj(data || {}) as unknown as Video[];
  }

  /**
   * Update a video
   */
  async update(id: string, data: Partial<VideoInput>): Promise<void> {
    const nowISO = new Date().toISOString();

    await mutate({
      action: "update",
      path: `videos/${id}`,
      data: {
        ...data,
        updatedAt: nowISO,
      },
      actionBy: "admin",
    });
  }

  /**
   * Delete a video
   */
  async delete(id: string): Promise<void> {
    await mutate({
      action: "delete",
      path: `videos/${id}`,
      actionBy: "admin",
    });
  }
}

export const videoService = new VideoService();
