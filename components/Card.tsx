interface CardProps {
    title: string;
    children: React.ReactNode;
}

const Card = ({ title, children }: CardProps) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        {children}
    </div>
);

export default Card;