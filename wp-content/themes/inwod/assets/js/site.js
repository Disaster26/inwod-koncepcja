(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }

  /* menu mobilne */
  var burger = $('.burger'), menu = $('#menu-mob');
  function zamknij() { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Otwórz menu'); document.body.style.overflow = ''; }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var otw = menu.hidden;
      menu.hidden = !otw;
      burger.setAttribute('aria-expanded', String(otw));
      burger.setAttribute('aria-label', otw ? 'Zamknij menu' : 'Otwórz menu');
      document.body.style.overflow = otw ? 'hidden' : '';
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) zamknij(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { zamknij(); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 1180 && !menu.hidden) zamknij(); });
  }

  /* tor kart i schemat drogi wody: palec, mysz (przeciąganie), strzałki, klawiatura */
  function przeciagnij(tor) {
    var p0 = null, sl = 0, ruch = false;
    tor.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      p0 = e.clientX; sl = tor.scrollLeft; ruch = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (p0 === null) return;
      var dx = e.clientX - p0;
      if (!ruch && Math.abs(dx) > 5) { ruch = true; tor.classList.add('ciag'); }
      if (ruch) { tor.scrollLeft = sl - dx; e.preventDefault(); }
    });
    var koniec = function () {
      if (p0 === null) return;
      p0 = null;
      if (ruch) { tor.classList.remove('ciag'); setTimeout(function () { ruch = false; }, 0); }
    };
    window.addEventListener('pointerup', koniec);
    window.addEventListener('pointercancel', koniec);
    tor.addEventListener('click', function (e) { if (ruch) { e.preventDefault(); e.stopPropagation(); } }, true);
    tor.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }
  $$('.tor').forEach(function (tor) {
    var sek = tor.closest('section'), btn = $$('[data-tor]', sek);
    var krok = function () { var k = tor.querySelector('.karta'); return k ? k.getBoundingClientRect().width + 24 : 300; };
    var stan = function () {
      if (btn.length < 2) return;
      btn[0].disabled = tor.scrollLeft < 4;
      btn[1].disabled = tor.scrollLeft > tor.scrollWidth - tor.clientWidth - 4;
    };
    var idz = function (d) { tor.scrollBy({ left: d * krok(), behavior: reduce ? 'auto' : 'smooth' }); };
    btn.forEach(function (b) { b.addEventListener('click', function () { idz(+b.getAttribute('data-tor')); }); });
    tor.addEventListener('scroll', function () { window.requestAnimationFrame(stan); }, { passive: true });
    tor.addEventListener('keydown', function (e) {
      if (e.target !== tor) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); idz(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); idz(-1); }
    });
    przeciagnij(tor);
    window.addEventListener('resize', stan);
    stan();
  });
  $$('.droga').forEach(przeciagnij);

  /* galeria: okno ze zdjęciami realizacji (strzałki, Esc, przesunięcie palcem) */
  var lb = $('#lb'), lbImg = $('#lb-img'), lbTxt = $('#lb-txt'), lista = [], nr = 0, wroc = null;
  function pokazZdj() {
    var z = lista[nr];
    lbImg.src = z.src; lbImg.alt = z.alt || '';
    lbTxt.textContent = (z.alt || '') + (lista.length > 1 ? '  (' + (nr + 1) + '/' + lista.length + ')' : '');
    $$('.lb-s', lb).forEach(function (b) { b.hidden = lista.length < 2; });
  }
  function lbZamknij() { lb.hidden = true; document.body.classList.remove('lb-on'); lbImg.removeAttribute('src'); if (wroc) wroc.focus(); }
  if (lb) {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-gal]');
      if (!b) return;
      try { lista = JSON.parse(b.getAttribute('data-gal')) || []; } catch (er) { lista = []; }
      if (!lista.length) return;
      nr = 0; wroc = b; pokazZdj();
      lb.hidden = false; document.body.classList.add('lb-on');
      $('.lb-x', lb).focus();
    });
    lb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (b) {
        var a = b.getAttribute('data-lb');
        if (a === 'x') lbZamknij();
        else { nr = (nr + (+a) + lista.length) % lista.length; pokazZdj(); }
      } else if (e.target === lb) lbZamknij();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') lbZamknij();
      if (e.key === 'ArrowRight' && lista.length > 1) { nr = (nr + 1) % lista.length; pokazZdj(); }
      if (e.key === 'ArrowLeft' && lista.length > 1) { nr = (nr - 1 + lista.length) % lista.length; pokazZdj(); }
      if (e.key === 'Tab') {
        var f = $$('button:not([hidden])', lb), i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null || lista.length < 2) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { nr = (nr + (dx < 0 ? 1 : -1) + lista.length) % lista.length; pokazZdj(); }
    });
  }

  /* formularz zapytania: świeży bilet (czas + nonce), wysyłka przez admin-ajax */
  var form = $('#form');
  if (form) {
    var info = $('#form-info'), ep = form.getAttribute('data-endpoint'), bilet = null, pobieranie = null;
    var pokaz = function (klasa, tekst) { info.className = 'form-info ' + klasa; info.textContent = tekst; };
    var pobierzBilet = function () {
      if (!ep) return Promise.resolve(null);
      if (bilet) return Promise.resolve(bilet);
      if (!pobieranie) {
        pobieranie = fetch(ep, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); })
          .then(function (d) { bilet = d; return d; }).catch(function () { pobieranie = null; return null; });
      }
      return pobieranie;
    };
    form.addEventListener('focusin', pobierzBilet, { once: true });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cyfry = (form.tel.value || '').replace(/\D/g, '');
      if (!form.imie.value.trim() || cyfry.length < 9) { pokaz('blad', 'Podaj imię i nazwisko (lub instytucję) oraz numer telefonu (9 cyfr).'); (form.imie.value.trim() ? form.tel : form.imie).focus(); return; }
      if (form.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value)) { pokaz('blad', 'Sprawdź adres e-mail albo zostaw to pole puste.'); form.email.focus(); return; }
      if (!form.zgoda.checked) { pokaz('blad', 'Zaznacz zgodę na kontakt w sprawie zapytania.'); form.zgoda.focus(); return; }
      if (!ep) { pokaz('ok', 'Wersja testowa strony: formularz zacznie wysyłać wiadomości na inwod@op.pl po uruchomieniu strony na inwod.pl.'); return; }
      var przycisk = form.querySelector('button[type=submit]');
      przycisk.disabled = true;
      pokaz('', 'Wysyłanie...');
      pobierzBilet().then(function (b) {
        var dane = { tk: b ? b.tk : '', n: b ? b.n : '', imie: form.imie.value, tel: form.tel.value, email: form.email.value, temat: form.temat ? form.temat.value : '', wiad: form.wiad.value, www: form.www.value, zgoda: form.zgoda.checked ? 1 : '' };
        return fetch(ep, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dane) });
      }).then(function (r) { return r.json().catch(function () { return { ok: false, msg: '' }; }); })
        .then(function (d) {
          przycisk.disabled = false; bilet = null; pobieranie = null;
          if (d && d.ok) { pokaz('ok', d.msg || 'Dziękujemy, wiadomość została wysłana.'); form.reset(); }
          else pokaz('blad', (d && d.msg) || 'Nie udało się wysłać. Zadzwoń do nas.');
        }).catch(function () { przycisk.disabled = false; pokaz('blad', 'Brak połączenia. Spróbuj ponownie albo zadzwoń.'); });
    });
  }

  /* zgoda na cookies (12 miesięcy: pamięć przeglądarki + cookie inw_zgoda) */
  var KL = 'inw_zgoda', DNI = 365, ck = $('#ck');
  var czytaj = function () {
    try { var s = JSON.parse(localStorage.getItem(KL) || 'null'); if (s && Date.now() - s.t < DNI * 864e5) return s; } catch (e) { }
    var m = document.cookie.match(/(?:^|; )inw_zgoda=([^;]+)/);
    if (m) { var a = decodeURIComponent(m[1]).split('|'); return { mapy: a[0] === '1', stat: a[1] === '1', t: +a[2] || Date.now() }; }
    return null;
  };
  var ZG = czytaj();
  var zapisz = function (z) {
    z.t = Date.now();
    try { localStorage.setItem(KL, JSON.stringify(z)); } catch (e) { }
    document.cookie = KL + '=' + encodeURIComponent((z.mapy ? '1' : '0') + '|' + (z.stat ? '1' : '0') + '|' + z.t) + '; max-age=' + (DNI * 86400) + '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    ZG = z; zastosuj();
  };
  var mapyOk = function () { return !ZG || ZG.mapy !== false; }; /* mapa od razu; po odmowie adres i "Wyznacz trasę" */
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var mapa = function (el) {
    if (mapyOk()) {
      if (!el.querySelector('iframe')) el.innerHTML = '<iframe title="Mapa dojazdu: ' + esc(el.dataset.adres) + '" src="' + esc(el.dataset.src) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
    } else if (!el.querySelector('.mz')) {
      el.innerHTML = '<div class="mz"><p class="mz-n">Mapa dojazdu</p><p class="mz-a">' + esc(el.dataset.adres) + '</p><div class="mz-b"><a href="' + esc(el.dataset.trasa) + '" target="_blank" rel="noopener">Wyznacz trasę</a><button type="button" data-mapa-pokaz>Pokaż mapę Google</button></div></div>';
    }
  };
  var zastosuj = function () {
    $$('[data-mapa]').forEach(mapa);
    if (ZG && ZG.stat && ck && ck.getAttribute('data-ga4') && !window.gtag) {
      var id = ck.getAttribute('data-ga4'), s = document.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', id, { anonymize_ip: true });
    }
  };
  var banerZamknij = function () { if (ck) ck.hidden = true; };
  var banerPokaz = function (ustaw) {
    if (!ck) return;
    ck.hidden = false;
    var m = $('#ckMapy'), st = $('#ckStat');
    if (m) m.checked = mapyOk();
    if (st) st.checked = !!(ZG && ZG.stat);
    var u = $('#ckUst'), zb = $('[data-ck=zapisz]'), ub = $('[data-ck=ustawienia]');
    u.hidden = !ustaw; zb.hidden = !ustaw; ub.hidden = !!ustaw; ub.setAttribute('aria-expanded', String(!!ustaw));
  };
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-mapa-pokaz]')) { var z = ZG || { stat: false }; z.mapy = true; zapisz(z); banerZamknij(); }
  });
  if (ck) {
    ck.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ck]'); if (!b) return;
      var a = b.getAttribute('data-ck');
      if (a === 'wszystkie') { zapisz({ mapy: true, stat: true }); banerZamknij(); }
      else if (a === 'niezbedne') { zapisz({ mapy: false, stat: false }); banerZamknij(); }
      else if (a === 'ustawienia') banerPokaz(true);
      else if (a === 'zapisz') { var st = $('#ckStat'); zapisz({ mapy: $('#ckMapy').checked, stat: st ? st.checked : false }); banerZamknij(); }
    });
    if (!ZG) banerPokaz(false);
  }
  $$('[data-cookies-ustaw]').forEach(function (b) { b.addEventListener('click', function () { banerPokaz(true); }); });
  zastosuj();
})();
