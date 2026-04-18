import Navbar from "../components/layout/Navbar";

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  );
};

export default MainLayout;
