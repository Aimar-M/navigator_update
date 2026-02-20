interface FeatureCollageProps {
  mainImg: string;
  mainAlt: string;
  overlapImg: string;
  overlapAlt: string;
  variant: "expenses" | "portrait";
}

export default function FeatureCollage({ mainImg, mainAlt, overlapImg, overlapAlt, variant }: FeatureCollageProps) {
  const variantClass = variant === "expenses" ? "feature-collage--expenses" : "feature-collage--portrait";

  return (
    <div className={`feature-collage ${variantClass}`}>
      <div className="feature-collage__main">
        <img src={mainImg} alt={mainAlt} loading="lazy" />
      </div>
      <div className="feature-collage__overlap">
        <img src={overlapImg} alt={overlapAlt} loading="lazy" />
      </div>
    </div>
  );
}
