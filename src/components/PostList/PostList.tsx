import type { PageEntry } from "@/types";
import { useLocation } from "@tanstack/react-router";
import { Fragment } from "react";
import { Link } from "@/components/Link";
import { PAGES } from "@/lib/content/content.gen";
import { formatDate } from "@/lib/formatDate";
import styles from "./PostList.module.css";

const getYear = (post?: PageEntry) => post?.date?.slice(0, 4);

export const PostList = () => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const prefix = `${pathname.replace(/\/$/, "")}/`;

  const posts = PAGES.filter((page) => page.path.startsWith(prefix)).sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );

  return (
    <>
      {posts.map((post, index) => (
        <Fragment key={post.path}>
          {getYear(post) && getYear(post) !== getYear(posts[index - 1]) && (
            <div className={styles.year}>
              <span>{getYear(post)}</span>
            </div>
          )}

          <Link href={post.path} className={styles.item}>
            <span className={styles.title}>{post.title}</span>

            {post.date && (
              <span className={styles.meta}>
                {formatDate(post.date, false)}
                {post.duration && ` · ${post.duration}`}
              </span>
            )}
          </Link>
        </Fragment>
      ))}
    </>
  );
};
