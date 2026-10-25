export const BACKGROUND = "src/assets/og/background.png";

export interface CardProps {
  title: string;
  subtitle?: string;
}

export const Card = ({ title, subtitle }: CardProps) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: 80,
      color: "#ddd",
      fontFamily: "Inter Latin, Inter Cyrillic",
      backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.85) 25%, rgba(0, 0, 0, 0)), url(${BACKGROUND})`,
      backgroundSize: "100% 100%",
    }}
  >
    <span style={{ fontFamily: "DM Mono", fontSize: 28, color: "#888" }}>daniilarz.me</span>
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <span style={{ fontSize: 76, fontWeight: 500, lineHeight: 1.15, letterSpacing: "0.005em" }}>
        {title}
      </span>

      {subtitle && (
        <span style={{ fontSize: 34, lineHeight: 1.35, fontStyle: "italic", color: "#bbb" }}>
          {subtitle}
        </span>
      )}
    </div>
  </div>
);
