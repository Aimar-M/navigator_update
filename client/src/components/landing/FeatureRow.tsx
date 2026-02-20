import ScrollReveal from "./ScrollReveal";

interface FeatureRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  image: React.ReactNode;
  reverse?: boolean;
}

export default function FeatureRow({ icon, title, description, image, reverse = false }: FeatureRowProps) {
  return (
    <ScrollReveal>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center mb-24 last:mb-0`}>
        <div className={reverse ? "md:order-2" : ""}>
          {image}
        </div>
        <div className={`p-8 ${reverse ? "md:order-1" : ""}`}>
          <div className="w-12 h-12 rounded-lg bg-nav-gray-100 flex items-center justify-center mb-6">
            {icon}
          </div>
          <h3 className="text-h3 mb-4">{title}</h3>
          <p className="text-nav-gray-500 text-[1.0625rem] leading-[1.7]">{description}</p>
        </div>
      </div>
    </ScrollReveal>
  );
}
