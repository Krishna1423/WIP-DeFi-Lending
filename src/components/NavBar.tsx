import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useLocation } from "react-router-dom";

interface NavLinkProps {
  to: string;
  current: string;
  children: React.ReactNode;
}

const NavLink = ({ to, current, children }: NavLinkProps) => (
  <Link
    to={to}
    className={`nav-link ${current.startsWith(to) ? "active" : ""}`}
  >
    {children}
  </Link>
);

export default function NavBar() {
  const { pathname } = useLocation();

  return (
    <header className="navbar">
      <Link to="/" className="logo">
        <span>Lock&Loan</span>
      </Link>

      <nav className="nav-links">
        <NavLink to="/borrow" current={pathname}>
          Borrow
        </NavLink>
        <NavLink to="/lend" current={pathname}>
          Lend
        </NavLink>
        <NavLink to="/my-loans" current={pathname}>
          My Loans
        </NavLink>
      </nav>

      <div className="wallet-connect">
        <ConnectButton
          accountStatus="avatar"
          chainStatus="icon"
          showBalance={false}
        />
      </div>
    </header>
  );
}
