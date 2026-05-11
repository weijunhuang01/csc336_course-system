import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ 
      padding: "1rem", 
      background: "#fff", 
      borderBottom: "1px solid #ddd",
      display: "flex",
      gap: "20px" 
    }}>
      <Link to="/student" style={{ fontWeight: "bold", textDecoration: "none", color: "#2563eb" }}>
        Student Dashboard
      </Link>
      <Link to="/instructor" style={{ fontWeight: "bold", textDecoration: "none", color: "#2563eb" }}>
        Instructor Dashboard
      </Link>
    </nav>
  );
}