interface StepCardProps {
  number: number;
  title: string;
  description: string;
  image: React.ReactNode;
}

export default function StepCard({ number, title, description, image }: StepCardProps) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-nav-black text-white text-xl font-bold flex items-center justify-center mx-auto mb-6">
        {number}
      </div>
      <div className="rounded-xl overflow-hidden mb-6">
        {image}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-nav-gray-500 text-[0.9375rem] leading-relaxed max-w-[320px] mx-auto">
        {description}
      </p>
    </div>
  );
}
