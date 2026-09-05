import ArrowUpIcon from "~icons/ri/arrow-up-line";
import ArticleIcon from "~icons/ri/article-line";
import CameraIcon from "~icons/ri/camera-3-line";
import LightbulbIcon from "~icons/ri/lightbulb-line";
import MoonIcon from "~icons/ri/moon-line";
import SunIcon from "~icons/ri/sun-line";
import GithubIcon from "~icons/uil/github-alt";
import { Link } from "@/components/Link";
import { useTheme } from "@/lib/theme";
import styles from "./Header.module.css";

export const Header = () => {
  const { toggleDark } = useTheme();

  return (
    <header>
      <button
        title="Scroll to top"
        className={styles.topButton}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUpIcon />
      </button>

      <nav className={styles.nav}>
        <div className={styles.left} />
        <div className={styles.right}>
          <Link href="/blog" title="Blog">
            <span className="mobile-hidden">Blog</span>
            <span className="mobile-only">
              <ArticleIcon />
            </span>
          </Link>

          <Link href="/" title="Projects">
            <span className="mobile-hidden">Projects</span>
            <span className="mobile-only">
              <LightbulbIcon />
            </span>
          </Link>

          <Link href="/" title="Photos">
            <CameraIcon />
          </Link>

          <Link href="https://github.com/FantomStudy" title="GitHub">
            <GithubIcon />
          </Link>

          <button onClick={toggleDark} title="Toggle color">
            <SunIcon className="light-only" />
            <MoonIcon className="dark-only" />
          </button>
        </div>
      </nav>
    </header>
  );
};
