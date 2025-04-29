import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom"
import HomeLogoButton from "./components/HomeLogoButton"
import ProfilePage from "./components/ProfilePage"
import WalletConnect from "./components/WalletConnect"
import "./index.css"

function App() {
    return (
        <Router>
            <div className="app-root">
                <header className="top-bar">
                    <div className="top-bar-left">
                        <HomeLogoButton />
                    </div>
                    <div className="top-bar-right">
                        <WalletConnect />
                        <Link to="/profile" className="profile-btn">
                            Profile
                        </Link>
                    </div>
                </header>
                <main className="main-content">
                    <Routes>
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/" element={<div>{/* Main content */}</div>} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

export default App
