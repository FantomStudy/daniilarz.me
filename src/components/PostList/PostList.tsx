import type { PageEntry } from "@/lib/content/types";
import { useLocation, useRouter } from "@tanstack/react-router";
import { Fragment } from "react";
import { Link } from "@/components/Link";
import { formatDate } from "@/lib/formatDate";
import styles from "./PostList.module.css";

const getYear = (post?: PageEntry) => post?.date?.slice(0, 4);

export const PostList = () => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const routes = useRouter().routesById;
  const prefix = `${pathname.replace(/\/$/, "")}/`;

  const posts = Object.values(routes)
    .flatMap((route) => route.options.staticData?.page ?? [])
    .filter((page) => page.path.startsWith(prefix))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

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
