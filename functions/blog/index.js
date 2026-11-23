import { renderBlog } from "../../lib/blog.js";
export const onRequestGet = ctx => renderBlog(ctx, "");
