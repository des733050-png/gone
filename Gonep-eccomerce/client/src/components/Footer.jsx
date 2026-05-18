import '@/style/footer.css'
import footerLogo from '/footer_logo.png'
import appStore from '/images/logos/App-Store-icon.png'
import playStore from '/images/logos/playstore-icon.png'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="footer">

      <div className="footer-top d-flex justify-content-evenly">
        <h6>For a better experience, download the Gonep app now</h6>
        <div className='d-flex gap-3'>
          <img src={appStore} alt="App Store" loading='lazy' />
          <img src={playStore} alt="Play Store" loading='lazy' />
        </div>
      </div>

      <div className="footer-body d-flex justify-content-around">

        <ul className="footer-links">
          <li><Link to="/">SHOP</Link></li>
          <li><Link to="/cart">Cart</Link></li>
          <li><Link to="/orders">Orders</Link></li>
          <li><Link to="/register">Register</Link></li>
          <li><Link to="/login">Login</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>

        <div className="footer-social">
          <a href="https://www.facebook.com/Gonepharmaceuticals" target="_blank" rel="noreferrer">
            <i className="fab fa-facebook"></i>
          </a>
          <a href="https://www.instagram.com/gonep_pharmaceauticals/" target="_blank" rel="noreferrer">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://www.linkedin.com/company/g-one-pharmaceuticals/" target="_blank" rel="noreferrer">
            <i className="fab fa-linkedin"></i>
          </a>
        </div>

      </div>

      <div className="footer-bottom">
        <small>© 2026 Gonep. All rights reserved. | 2nd Floor, Chandaria Innovation Centre, Nairobi, Kenya | +254 707 231 654</small>
      </div>

    </footer>
  )
}

export default Footer
