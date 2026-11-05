import { apiClient } from "./client";
import type { CommunityPost, CommunityGroup, CommunityBadge, PostComment } from "../types";

// In-memory / localStorage cache for seamless state retention
const STORAGE_POSTS_KEY = "syncrogo_community_posts_v1";
let cachedPosts: CommunityPost[] = [];
const uniquePosts = (posts: CommunityPost[]) =>
  [...new Map(posts.map((post) => [post.id, post])).values()];

const getSavedPosts = (): CommunityPost[] => {
  return cachedPosts;
};

const savePosts = (posts: CommunityPost[]) => {
  cachedPosts = uniquePosts(posts);
  try {
    localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(cachedPosts));
  } catch { }
};

export const communityService = {
  getPosts: async (category?: string, query?: string): Promise<CommunityPost[]> => {
    // Attempt backend connection if available
    try {
      const res = await apiClient.get("/api/v1/community/posts", {
        params: { category, search: query },
        timeout: 8000,
      });
      if (res.data && Array.isArray(res.data)) {
        const posts = uniquePosts(res.data);
        savePosts(posts);
        return posts;
      }
    } catch {
      // Graceful fallback to client cache
    }

    let posts = getSavedPosts();

    if (query && query.trim()) {
      const q = query.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.groupName.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.routeInfo?.from.toLowerCase().includes(q) ||
          p.routeInfo?.to.toLowerCase().includes(q)
      );
    }

    if (category && category !== "all" && category !== "for_you") {
      if (category === "my_groups") {
        posts = [];
      } else if (category === "trending") {
        posts = [...posts].sort((a, b) => (b.likes + b.commentsCount) - (a.likes + a.commentsCount));
      } else if (category === "nearby") {
        posts = posts.filter((p) => Boolean(p.routeInfo));
      }
    }

    return uniquePosts(posts);
  },

  createPost: async (postData: Partial<CommunityPost>): Promise<CommunityPost> => {
    const { data } = await apiClient.post<CommunityPost>("/api/v1/community/posts", {
      groupName: postData.groupName || "Community",
      postType: postData.postType || "general",
      title: postData.title || null,
      content: postData.content || "",
      routeInfo: postData.routeInfo,
    }, { timeout: 8000 });
    savePosts([data, ...getSavedPosts()]);
    return data;
  },

  toggleLikePost: (postId: string): CommunityPost[] => {
    const posts = getSavedPosts().map((p) => {
      if (p.id === postId) {
        const hasLiked = !p.hasLiked;
        return {
          ...p,
          hasLiked,
          likes: hasLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      }
      return p;
    });
    savePosts(posts);
    return posts;
  },

  toggleSavePost: (postId: string): CommunityPost[] => {
    const posts = getSavedPosts().map((p) => {
      if (p.id === postId) {
        return { ...p, hasSaved: !p.hasSaved };
      }
      return p;
    });
    savePosts(posts);
    return posts;
  },

  addComment: (postId: string, text: string, authorName: string = "You"): CommunityPost[] => {
    const posts = getSavedPosts().map((p) => {
      if (p.id === postId) {
        const newComment: PostComment = {
          id: `comment-${Date.now()}`,
          postId,
          authorName,
          isVerified: true,
          text,
          createdAt: "Just now",
          likes: 0,
        };
        const comments = p.comments ? [...p.comments, newComment] : [newComment];
        return {
          ...p,
          comments,
          commentsCount: comments.length,
        };
      }
      return p;
    });
    savePosts(posts);
    return posts;
  },

  getGroups: async (): Promise<CommunityGroup[]> => {
    const { data } = await apiClient.get<CommunityGroup[]>("/api/v1/community/groups");
    return data;
  },

  createGroup: async (name: string, description: string): Promise<CommunityGroup> => {
    const { data } = await apiClient.post<CommunityGroup>("/api/v1/community/groups", { name, description });
    return data;
  },

  toggleGroupMembership: async (groupId: string, isJoined: boolean): Promise<void> => {
    const url = `/api/v1/community/groups/${groupId}/join`;
    if (isJoined) await apiClient.delete(url);
    else await apiClient.post(url);
  },

  getBadges: (): CommunityBadge[] => [],
};
