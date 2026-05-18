import { serviceHighlights } from "../data/data";
import Typewriter from "typewriter-effect";

function Hero() {
  return (
    <section className="hero-section px-4 py-4">

      {/* Service highlights — top */}
      <div className="service-highlights mb-5">
        <div className="row g-3">
          {serviceHighlights.map((item, index) => (
            <div key={index} className="col-12 col-md-4">
              <div className="service-card d-flex align-items-start gap-3 p-3 h-100 rounded" style={{ backgroundColor: 'var(--primary-light)', border: '1px solid var(--border)' }}>
                <i className={`fa-solid ${item.icon} fs-3`} style={{ color: 'var(--primary)' }}></i>
                <div>
                  <h6 className="mb-1 fw-bold" style={{ fontSize: '1rem' }}>{item.title}</h6>
                  <p className="mb-0 small" style={{ color: 'var(--text-sec)' }}>{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero text + image */}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-4">
        <div className="heroo-section-info">
          <h1 className="fw-bold mb-3" style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            YOUR HEALTH, DELIVERED WITH CARE
          </h1>
          <p className="mb-2" style={{ fontSize: '1.05rem', color: 'var(--text-sec)' }}>
            Transforming Healthcare Access Across Africa
          </p>
          <p className="mb-3" style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Bringing certified medicines and health supplies closer to every community
          </p>
          <a href="#product-section" className="btn btn-primary mb-4 px-4 py-2" style={{ borderRadius: '50px', fontWeight: 600 }}>
            SHOP NOW
          </a>
          <div className="fw-semibold" style={{ fontFamily: 'monospace', color: 'var(--text)', fontSize: '0.95rem', minHeight: '2.5rem' }}>
            <Typewriter
              options={{
                strings: [
                  "Prescription medicines delivered safely to your door",
                  "Certified OTC products and pharmacy supplies, always in stock",
                  "Medical devices and diagnostics for home and clinic use",
                  "Health & wellness products from trusted, verified suppliers",
                ],
                autoStart: true,
                loop: true,
                delay: 75,
                deleteSpeed: 50,
              }}
            />
          </div>
        </div>

        <div className="hero-section-image d-none d-lg-block flex-shrink-0">
          <img className="rounded shadow" src="/hero-banner.webp" height={260} alt="Gonep healthcare" style={{ objectFit: 'cover', borderRadius: '16px' }} />
        </div>
      </div>

      {/* Mission strip */}
      <div className="d-flex justify-content-between align-items-center py-3 px-4 rounded mb-2"
        style={{ background: 'var(--primary-mid)', border: '1px solid var(--border)' }}>
        <h5 className="mb-0 fw-semibold" style={{ color: 'var(--primary-dark)', fontSize: '1.05rem' }}>
          Quality Healthcare Products You Can Trust
        </h5>
        <p className="mb-0 d-none d-md-block" style={{ fontSize: '0.9rem', color: 'var(--text-sec)' }}>
          From prescription medicines to medical devices and wellness essentials, Gonep connects you with licensed suppliers.
        </p>
      </div>

    </section>
  );
}

export default Hero;
