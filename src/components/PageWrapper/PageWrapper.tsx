import type { Frontmatter } from "@/types";
import { Link, useLocation } from "@tanstack/react-router";
import { clsx } from "clsx";
import { formatDate } from "@/lib/formatDate";
import styles from "./PageWrapper.module.css";

interface PageWrapperProps {
  children: React.ReactNode;
  frontmatter?: Frontmatter;
}

export const PageWrapper = ({ children, frontmatter }: PageWrapperProps) => {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <>
      {frontmatter && (
        <div className={clsx("prose", styles.header, frontmatter.wrapperClass)}>
          <h1>{frontmatter.title}</h1>

          {frontmatter.date && (
            <p className={styles.meta}>
              {formatDate(frontmatter.date)}
              {frontmatter.duration && <span> · {frontmatter.duration}</span>}
            </p>
          )}

          {frontmatter.description && (
            <p className={styles.description}>{frontmatter.description}</p>
          )}
        </div>
      )}

      <article className={clsx("prose", styles.article)}>{children}</article>

      {pathname !== "/" && (
        <div className={clsx("prose", styles.footer)}>
          <br />
          <span className={styles.chevron}>{">"} </span>
          <Link to=".." className={styles.command}>
            cd ..
          </Link>
        </div>
      )}
    </>
  );
};
