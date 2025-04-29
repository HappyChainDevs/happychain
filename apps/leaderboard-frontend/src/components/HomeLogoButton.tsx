import { Link } from "react-router-dom"
import logo from "../../public/happychain.png"

const HomeLogoButton = () => (
    <Link to="/" className="home-logo-btn" aria-label="Home">
        <span className="home-logo-circle">
            <img src={logo} alt="HappyChain Home" className="home-logo-img" />
        </span>
    </Link>
)

export default HomeLogoButton
