import { Link } from "react-router";

export default function EmptyState({
  title,
  text,
  action = "Continue shopping",
  to = "/products",
}: {
  title: string;
  text: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="page-empty-state">
      <p>Forma / Studio</p>
      <h2>{title}</h2>
      <span>{text}</span>
      <Link to={to}>{action}</Link>
    </div>
  );
}
