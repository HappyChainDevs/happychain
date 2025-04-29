import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom"
import GamesPage from "./components/GamesPage"
import GuildsPage from "./components/GuildsPage"
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
                        <Link to="/guilds" className="profile-btn">
                            Guilds
                        </Link>
                        <Link to="/games" className="profile-btn">
                            Games
                        </Link>
                        <Link to="/profile" className="profile-btn">
                            Profile
                        </Link>
                    </div>
                </header>
                <main className="main-content">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <div className="home-welcome-box">
                                    <h1 className="home-welcome-title">Welcome to HappyChain Leaderboard!</h1>
                                    {/* Future: leaderboard grid/list goes here */}
                                </div>
                            }
                        />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/guilds" element={<GuildsPage />} />
                        <Route path="/games" element={<GamesPage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

export default App
