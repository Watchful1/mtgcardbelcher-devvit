// Reddit ids: comments are t1_…, posts t3_…. Payloads and settings sometimes
// give them without the prefix.

export type CommentId = `t1_${string}`;
export type PostId = `t3_${string}`;

export function asCommentId(id: string): CommentId {
  return (id.startsWith('t1_') ? id : `t1_${id}`) as CommentId;
}

export function asPostId(id: string): PostId {
  return (id.startsWith('t3_') ? id : `t3_${id}`) as PostId;
}

/** A t1_ or t3_ id, as Reddit's comment API takes for a parent. */
export function asParentId(id: string): CommentId | PostId {
  return id as CommentId | PostId;
}
