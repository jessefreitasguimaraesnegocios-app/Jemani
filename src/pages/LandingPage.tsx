import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight,
  Clock3, MapPin, ShieldCheck, Smartphone, Sparkles,
} from 'lucide-react'
import { usarIdioma } from '@/i18n/usarIdioma'
import './LandingPage.css'

const copy = {
  'pt-BR': {
    nav: ['A experiência', 'A frota', 'O aplicativo'],
    signIn: 'Entrar', create: 'Criar conta', eyebrow: 'LOS ANGELES · CALIFÓRNIA',
    title: <>Chegar bem<br /><em>muda tudo.</em></>,
    intro: 'Uma experiência de transporte executivo pensada em cada detalhe — do primeiro toque ao destino.',
    book: 'Planejar minha viagem', discover: 'Descobrir a Jemani', imageCaption: 'Uma frota à altura dos seus planos.',
    strip: ['Motoristas profissionais', 'Reserva simples', 'Acompanhamento da viagem'],
    experienceEyebrow: 'O tempo é seu', experienceTitle: <>Mais do que um trajeto.<br /><em>Um jeito melhor de viajar.</em></>,
    experienceText: 'A Jemani conecta você a empresas parceiras selecionadas para viagens de aeroporto, compromissos importantes e momentos que pedem um cuidado especial.',
    features: [
      ['Uma reserva, sem complicação', 'Escolha origem, destino, horário e a categoria ideal em poucos passos.'],
      ['Atenção em cada detalhe', 'Acompanhe a confirmação, conheça seu motorista e siga sua viagem com clareza.'],
      ['Conforto que combina com você', 'De sedãs executivos a vans espaçosas, encontre o espaço certo para cada ocasião.'],
    ],
    fleetEyebrow: 'Sua viagem, seu estilo', fleetTitle: <>Encontre o seu<br /><em>próximo carro.</em></>, fleetText: 'Uma seleção que vai do conforto executivo ao espaço para todo o grupo.',
    fleet: [
      ['JEMANI EXECUTIVE', 'Sedãs executivos', '/frota/classe-s.jpg'],
      ['JEMANI BLACK', 'Uma experiência exclusiva', '/frota/lucid.jpg'],
      ['JEMANI SUV', 'Espaço para ir mais longe', '/frota/escalade.jpg'],
      ['JEMANI LUXE', 'Presença em cada chegada', '/frota/volvo.jpg'],
      ['JEMANI VAN', 'Mais espaço para o grupo', '/frota/sprinter.jpg'],
      ['JEMANI CHARTER', 'Viagens para grupos e eventos', '/frota/charter.jpg'],
    ],
    appEyebrow: 'Jemani no seu ritmo', appTitle: <>Sua próxima viagem<br /><em>começa no celular.</em></>,
    appText: 'Reserve com facilidade, acompanhe os detalhes e tenha sua experiência Jemani sempre à mão.',
    android: 'ANDROID', apple: 'IPHONE & IPAD', soon: 'Aplicativo em breve',
    androidDetail: 'Instale o APK de teste do Jemani. Ainda não publicado na Play Store.', downloadApk: 'Baixar APK', androidReady: 'APK Android de teste',
    appleReady: 'App para iPhone',
    appleDetail: 'Instale na tela de início pelo Safari. Ainda não publicado na App Store.',
    installIphone: 'Instalar no iPhone',
    iphoneStepsTitle: 'Como instalar no iPhone',
    iphoneSteps: [
      'Abra este site no Safari do iPhone.',
      'Toque em Compartilhar, na barra de baixo.',
      'Escolha Adicionar à Tela de Início.',
    ],
    webApp: 'Acessar a Jemani agora', webNote: 'A versão web já está pronta para você conhecer.',
    stepsEyebrow: 'Do primeiro toque à chegada', stepsTitle: <>Sua viagem, em<br /><em>três passos.</em></>,
    steps: [['01', 'Conte para onde vai', 'Informe o embarque, o destino e quando precisa sair.'], ['02', 'Escolha sua experiência', 'Selecione o veículo que combina com a viagem.'], ['03', 'Aproveite o caminho', 'Acompanhe a confirmação e siga com tranquilidade.']],
    finalTitle: <>Los Angeles espera.<br /><em>Vamos nessa?</em></>, finalCta: 'Começar minha reserva',
    footer: 'Transporte executivo em Los Angeles e região metropolitana.', rights: '© Jemani. Todos os direitos reservados.',
  },
  en: {
    nav: ['The experience', 'The fleet', 'The app'], signIn: 'Sign in', create: 'Create account', eyebrow: 'LOS ANGELES · CALIFORNIA',
    title: <>Arriving well<br /><em>changes everything.</em></>, intro: 'Executive transportation with care in every detail — from your first tap to your destination.',
    book: 'Plan my ride', discover: 'Discover Jemani', imageCaption: 'A fleet worthy of your plans.', strip: ['Professional drivers', 'Effortless booking', 'Trip updates'],
    experienceEyebrow: 'Your time is yours', experienceTitle: <>More than a ride.<br /><em>A better way to travel.</em></>, experienceText: 'Jemani connects you with selected partner companies for airport transfers, important meetings, and the moments that deserve extra care.',
    features: [['One booking, made simple', 'Choose your pickup, destination, time, and ideal ride in just a few steps.'], ['Care in every detail', 'Follow your confirmation, meet your driver, and stay informed throughout your trip.'], ['Comfort that fits you', 'From executive sedans to roomy vans, find the right fit for every occasion.']],
    fleetEyebrow: 'Your ride, your style', fleetTitle: <>Meet your<br /><em>next ride.</em></>, fleetText: 'A curated selection, from executive comfort to room for the whole group.',
    fleet: [['JEMANI EXECUTIVE', 'Executive sedans', '/frota/classe-s.jpg'], ['JEMANI BLACK', 'An exclusive experience', '/frota/lucid.jpg'], ['JEMANI SUV', 'Room to go further', '/frota/escalade.jpg'], ['JEMANI LUXE', 'Make every arrival count', '/frota/volvo.jpg'], ['JEMANI VAN', 'More room for your group', '/frota/sprinter.jpg'], ['JEMANI CHARTER', 'Group and event travel', '/frota/charter.jpg']],
    appEyebrow: 'Jemani, your way', appTitle: <>Your next ride<br /><em>starts on your phone.</em></>, appText: 'Book with ease, follow every detail, and keep your Jemani experience close at hand.',
    android: 'ANDROID', apple: 'IPHONE & IPAD', soon: 'App coming soon', androidDetail: 'Install the Jemani test APK. Not yet published on Google Play.', downloadApk: 'Download APK', androidReady: 'Android test APK', appleReady: 'iPhone app', appleDetail: 'Install it on your Home Screen from Safari. Not yet on the App Store.', installIphone: 'Install on iPhone', iphoneStepsTitle: 'How to install on iPhone', iphoneSteps: ['Open this site in Safari on your iPhone.', 'Tap Share in the bottom bar.', 'Choose Add to Home Screen.'], webApp: 'Explore Jemani now', webNote: 'The web experience is ready for you.',
    stepsEyebrow: 'From first tap to arrival', stepsTitle: <>Your trip in<br /><em>three steps.</em></>, steps: [['01', 'Tell us where you’re going', 'Enter your pickup, destination, and preferred time.'], ['02', 'Choose your experience', 'Select the vehicle that fits your trip.'], ['03', 'Enjoy the ride', 'Follow your confirmation and travel with ease.']],
    finalTitle: <>Los Angeles is waiting.<br /><em>Shall we go?</em></>, finalCta: 'Start my booking', footer: 'Executive transportation across Los Angeles and nearby areas.', rights: '© Jemani. All rights reserved.',
  },
  es: {
    nav: ['La experiencia', 'La flota', 'La app'], signIn: 'Entrar', create: 'Crear cuenta', eyebrow: 'LOS ANGELES · CALIFORNIA',
    title: <>Llegar bien<br /><em>lo cambia todo.</em></>, intro: 'Transporte ejecutivo cuidado en cada detalle — desde el primer toque hasta tu destino.', book: 'Planear mi viaje', discover: 'Descubrir Jemani', imageCaption: 'Una flota a la altura de tus planes.', strip: ['Conductores profesionales', 'Reserva sencilla', 'Seguimiento del viaje'],
    experienceEyebrow: 'Tu tiempo es tuyo', experienceTitle: <>Más que un trayecto.<br /><em>Una mejor forma de viajar.</em></>, experienceText: 'Jemani te conecta con empresas asociadas seleccionadas para traslados al aeropuerto, compromisos importantes y momentos que merecen un cuidado especial.',
    features: [['Una reserva, sin complicaciones', 'Elige origen, destino, horario y la categoría ideal en pocos pasos.'], ['Atención en cada detalle', 'Sigue la confirmación, conoce a tu conductor y viaja con claridad.'], ['Comodidad a tu medida', 'Desde sedanes ejecutivos hasta vans espaciosas, encuentra el vehículo ideal.']],
    fleetEyebrow: 'Tu viaje, tu estilo', fleetTitle: <>Encuentra tu<br /><em>próximo vehículo.</em></>, fleetText: 'Una selección que va desde el confort ejecutivo hasta espacio para todo el grupo.', fleet: [['JEMANI EXECUTIVE', 'Sedanes ejecutivos', '/frota/classe-s.jpg'], ['JEMANI BLACK', 'Una experiencia exclusiva', '/frota/lucid.jpg'], ['JEMANI SUV', 'Espacio para ir más lejos', '/frota/escalade.jpg'], ['JEMANI LUXE', 'Presencia en cada llegada', '/frota/volvo.jpg'], ['JEMANI VAN', 'Más espacio para el grupo', '/frota/sprinter.jpg'], ['JEMANI CHARTER', 'Viajes para grupos y eventos', '/frota/charter.jpg']],
    appEyebrow: 'Jemani a tu ritmo', appTitle: <>Tu próximo viaje<br /><em>empieza en tu móvil.</em></>, appText: 'Reserva fácilmente, sigue cada detalle y lleva tu experiencia Jemani contigo.', android: 'ANDROID', apple: 'IPHONE & IPAD', soon: 'App próximamente', androidDetail: 'Instala el APK de prueba de Jemani. Aún no está en Google Play.', downloadApk: 'Descargar APK', androidReady: 'APK Android de prueba', appleReady: 'App para iPhone', appleDetail: 'Instálala en la pantalla de inicio desde Safari. Aún no está en la App Store.', installIphone: 'Instalar en el iPhone', iphoneStepsTitle: 'Cómo instalar en el iPhone', iphoneSteps: ['Abre este sitio en Safari del iPhone.', 'Toca Compartir, en la barra inferior.', 'Elige Agregar a pantalla de inicio.'], webApp: 'Conocer Jemani ahora', webNote: 'La versión web ya está lista para ti.',
    stepsEyebrow: 'Del primer toque a la llegada', stepsTitle: <>Tu viaje en<br /><em>tres pasos.</em></>, steps: [['01', 'Cuéntanos adónde vas', 'Indica el origen, el destino y el horario.'], ['02', 'Elige tu experiencia', 'Selecciona el vehículo ideal para tu viaje.'], ['03', 'Disfruta el camino', 'Sigue la confirmación y viaja con tranquilidad.']], finalTitle: <>Los Angeles te espera.<br /><em>¿Vamos?</em></>, finalCta: 'Empezar mi reserva', footer: 'Transporte ejecutivo en Los Angeles y alrededores.', rights: '© Jemani. Todos los derechos reservados.',
  },
} as const

export function LandingPage() {
  const { idioma } = usarIdioma()
  const content = copy[idioma]
  const fleetTrack = useRef<HTMLDivElement>(null)
  const [passosIphoneAbertos, definirPassosIphoneAbertos] = useState(false)
  const alternarPassosIphone = () => definirPassosIphoneAbertos((aberto) => !aberto)
  const scrollFleet = (direction: -1 | 1) => fleetTrack.current?.scrollBy({ left: direction * 360, behavior: 'smooth' })

  return (
    <main className="jemani-site">
      <header className="site-header">
        <a className="site-brand" href="#inicio" aria-label="Jemani — início"><span className="site-brand-mark">J</span><span>JEMANI<small>EXECUTIVE MOBILITY</small></span></a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#experiencia">{content.nav[0]}</a><a href="#frota">{content.nav[1]}</a><a href="#app">{content.nav[2]}</a>
        </nav>
        <div className="site-actions"><Link to="/entrar" className="site-login">{content.signIn}</Link><Link to="/cadastrar" className="site-header-cta">{content.create}<ArrowUpRight size={15} /></Link></div>
        <a className="site-mobile-cta" href="#app" aria-label={content.nav[2]}><Smartphone size={19} /></a>
      </header>

      <section id="inicio" className="site-hero">
        <div className="hero-copy">
          <div className="site-eyebrow"><span />{content.eyebrow}</div>
          <h1>{content.title}</h1>
          <p className="hero-intro">{content.intro}</p>
          <div className="hero-buttons"><Link to="/cadastrar" className="site-button site-button-gold">{content.book}<ArrowRight size={17} /></Link><a className="hero-text-link" href="#experiencia">{content.discover}<ArrowDown size={16} /></a></div>
          <div className="hero-note"><MapPin size={15} /> Los Angeles · Santa Monica · Beverly Hills</div>
        </div>
        <div className="hero-image-wrap">
          <div className="hero-image" role="img" aria-label="A frota premium da Jemani em um elegante terminal" />
          <div className="hero-image-shade" />
          <div className="hero-image-caption"><span className="caption-line" /><span>{content.imageCaption}</span></div>
          <div className="hero-image-index">01 <span>/ 06</span></div>
          <div className="hero-floating-card"><span className="floating-icon"><Sparkles size={16} /></span><span><strong>JEMANI</strong><small>Move with intention.</small></span></div>
        </div>
        <a className="hero-scroll" href="#experiencia"><span>SCROLL TO EXPLORE</span><ArrowDown size={14} /></a>
      </section>

      <div className="site-trust-strip">{content.strip.map((item, index) => <div key={item}><Check size={15} /><span>{item}</span>{index < 2 && <i />}</div>)}</div>

      <section id="experiencia" className="experience-section site-section">
        <div className="section-heading"><div><span className="section-kicker">01 / {content.experienceEyebrow}</span><h2>{content.experienceTitle}</h2></div><p>{content.experienceText}</p></div>
        <div className="feature-grid">{content.features.map(([title, description], index) => {
          const Icon = [Clock3, ShieldCheck, Sparkles][index]
          return <article className="feature-card" key={title}><div className="feature-icon"><Icon size={21} /></div><span className="feature-index">0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
        })}</div>
      </section>

      <section id="frota" className="fleet-section site-section">
        <div className="fleet-top"><div><span className="section-kicker">02 / {content.fleetEyebrow}</span><h2>{content.fleetTitle}</h2></div><div className="fleet-intro"><p>{content.fleetText}</p><div className="fleet-controls"><button onClick={() => scrollFleet(-1)} aria-label="Previous vehicles"><ChevronLeft size={19} /></button><button onClick={() => scrollFleet(1)} aria-label="Next vehicles"><ChevronRight size={19} /></button></div></div></div>
        <div className="fleet-track" ref={fleetTrack}>{content.fleet.map(([name, description, image], index) => <article className="fleet-card" key={name}>
          <div className="fleet-card-image"><img src={image} alt={description} loading={index > 1 ? 'lazy' : 'eager'} /><span className="fleet-number">0{index + 1}</span><span className="fleet-image-glow" /></div>
          <div className="fleet-card-copy"><div><span>{name}</span><p>{description}</p></div><Link to="/cadastrar" aria-label={`${content.book}: ${name}`}><ArrowUpRight size={17} /></Link></div>
        </article>)}</div>
        <div className="fleet-bottom"><span>JEMANI FLEET · LOS ANGELES</span><span>01 — 06</span></div>
      </section>

      <section id="app" className="app-section">
        <div className="app-orbit app-orbit-one" /><div className="app-orbit app-orbit-two" />
        <div className="app-copy"><span className="section-kicker">03 / {content.appEyebrow}</span><h2>{content.appTitle}</h2><p>{content.appText}</p>
          <div className="app-platforms">
            <article className="platform-card platform-card-ready"><div className="platform-label"><Smartphone size={17} />{content.android}</div><strong>{content.androidReady}</strong><p>{content.androidDetail}</p><a className="platform-download" href="/downloads/jemani-android.apk" download="Jemani-Android.apk">{content.downloadApk}<ArrowDown size={13} /></a></article>
            <article className="platform-card platform-card-ready"><div className="platform-label"><Smartphone size={17} />{content.apple}</div><strong>{content.appleReady}</strong><p>{content.appleDetail}</p><button type="button" className="platform-download" aria-expanded={passosIphoneAbertos} aria-controls="instalar-iphone" onClick={alternarPassosIphone}>{content.installIphone}<ArrowDown size={13} /></button></article>
            {passosIphoneAbertos && <div className="iphone-passos" id="instalar-iphone"><strong>{content.iphoneStepsTitle}</strong><ol>{content.iphoneSteps.map((passo) => <li key={passo}>{passo}</li>)}</ol></div>}
          </div>
          <Link to="/cadastrar" className="site-button site-button-light">{content.webApp}<ArrowRight size={17} /></Link><span className="app-note">{content.webNote}</span>
        </div>
        <div className="app-visual"><div className="phone-halo" /><div className="phone-device"><div className="phone-island" /><div className="phone-screen-top"><span>JEMANI</span><span>9:41</span></div><div className="phone-screen-image" /><div className="phone-screen-content"><small>YOUR RIDE, REFINED</small><strong>Where to?</strong><div className="phone-route"><span /><span /><i /></div><div className="phone-car-mini"><img src="/frota/classe-s.jpg" alt="" /><span><b>Jemani Executive</b><small>Premium sedan</small></span><ArrowRight size={15} /></div><div className="phone-book-button">PLAN YOUR RIDE <ArrowRight size={12} /></div></div></div><div className="app-visual-caption"><span>JEMANI</span><span>YOUR CITY, IN GOOD HANDS.</span></div></div>
      </section>

      <section className="steps-section site-section"><div className="steps-heading"><span className="section-kicker">04 / {content.stepsEyebrow}</span><h2>{content.stepsTitle}</h2></div><div className="steps-list">{content.steps.map(([number, title, description]) => <article key={number} className="step-item"><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={17} /></article>)}</div></section>

      <section className="closing-section"><div className="closing-image" /><div className="closing-content"><span className="section-kicker">JEMANI · LOS ANGELES</span><h2>{content.finalTitle}</h2><Link to="/cadastrar" className="site-button site-button-gold">{content.finalCta}<ArrowRight size={17} /></Link></div></section>

      <footer className="site-footer"><a className="site-brand site-brand-footer" href="#inicio"><span className="site-brand-mark">J</span><span>JEMANI<small>EXECUTIVE MOBILITY</small></span></a><p>{content.footer}</p><span>{content.rights}</span><a className="back-top" href="#inicio" aria-label="Back to top"><ArrowDown size={16} /></a></footer>
    </main>
  )
}
