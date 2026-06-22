const navbarLinks = document.querySelectorAll(".nav-menu .nav-link");
const menuOpenButton = document.querySelector("#menu-open-button");
const menuCloseButton = document.querySelector("#menu-close-button");

menuOpenButton.addEventListener("click", () => {
  // Toggle mobile menu visibility
  document.body.classList.toggle("show-mobile-menu");
});

// Close menu when the close button is clicked
menuCloseButton.addEventListener("click", () => menuOpenButton.click());

// Close menu when nav link is clicked
navbarLinks.forEach((link) => {
  link.addEventListener("click", () => menuOpenButton.click());
});

// Dropdown Global Logic
window.toggleDropdown = function(e) {
  e.preventDefault();
  const dropdownMenu = document.getElementById('dropdownMenu');
  if (dropdownMenu) {
    dropdownMenu.classList.toggle('show');
  }
};

window.addEventListener('click', function(e) {
  if (!e.target.matches('#userDropdown') && !e.target.closest('#userDropdown')) {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu && dropdownMenu.classList.contains('show')) {
      dropdownMenu.classList.remove('show');
    }
  }
});

/* Initializing Swiper */
if (typeof Swiper !== 'undefined' && document.querySelector(".slider-wrapper")) {
  let swiper = new Swiper(".slider-wrapper", {
    loop: true,
    grabCursor: true,
    spaceBetween: 25,

    // Pagination bullets
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
      dynamicBullets: true,
    },

    // Navigation arrows
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },

    /* Responsive breakpoints */
    breakpoints: {
      0: {
        slidesPerView: 1,
      },
      768: {
        slidesPerView: 2,
      },
      1024: {
        slidesPerView: 3,
      },
    },
  });
}


// navbar name button

function toggleDropdown(event) {
  if (event) event.preventDefault();
  const dropdownMenu = document.getElementById('dropdownMenu');
  // Toggle the visibility of the dropdown menu
  if (dropdownMenu) {
    if (dropdownMenu.style.display === 'block') {
      dropdownMenu.style.display = 'none';
    } else {
      dropdownMenu.style.display = 'block';
    }
  }
}


document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.querySelector(".navbar");
  const menuOpenButton = document.getElementById("menu-open-button");
  const menuCloseButton = document.getElementById("menu-close-button");
  const navMenu = document.querySelector(".nav-menu");

  // Navbar is now always styled with fixed green background

  // Hamburger Menu Open
  menuOpenButton.addEventListener("click", function () {
    navMenu.classList.add("active");
  });

  // Hamburger Menu Close
  menuCloseButton.addEventListener("click", function () {
    navMenu.classList.remove("active");
  });
});

// Auth Check for Static HTML Pages (Synchronous Cache + Async Validate)
(function applyAuthUI() {
  function renderLoggedInUser(name, profilePic = null) {
    const loginLinks = document.querySelectorAll('a[href="/signup"], a[href="/login"]');
    loginLinks.forEach(link => {
      if (link.classList.contains('login-btn') || link.querySelector('.login-btn') || link.textContent.trim().toUpperCase() === 'LOG IN') {
        link.style.display = 'none';
      }
    });

    const navMenu = document.querySelector('.nav-menu');
    if (navMenu && !document.getElementById('userDropdown')) {
      const li = document.createElement('li');
      li.className = 'nav-item dropdown';
      li.innerHTML = `
        <a href="#" class="nav-link profile-link" id="userDropdown" onclick="toggleDropdown(event)">
          <img src="${profilePic || `https://ui-avatars.com/api/?name=${name}&background=1b5e20&color=fff&rounded=true`}" alt="User Avatar" class="user-avatar">
          <i class="fa fa-caret-down" style="font-size: 0.8em; margin-left: 4px;"></i>
        </a>
        <ul id="dropdownMenu" class="dropdown-menu profile-dropdown">
          <li class="dropdown-header">
            <img src="${profilePic || `https://ui-avatars.com/api/?name=${name}&background=1b5e20&color=fff&rounded=true`}" alt="User Avatar" class="header-avatar">
            <span class="greeting">${name}</span>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <a href="/account">
              <span class="icon-circle"><i class="fas fa-user"></i></span>
              <span class="menu-text">Account Info</span>
              <i class="fas fa-chevron-right chevron"></i>
            </a>
          </li>
          <li>
            <a href="/orders">
              <span class="icon-circle"><i class="fas fa-box"></i></span>
              <span class="menu-text">Order History</span>
              <i class="fas fa-chevron-right chevron"></i>
            </a>
          </li>
          <li>
            <a href="/support">
              <span class="icon-circle"><i class="fas fa-headset"></i></span>
              <span class="menu-text">Support</span>
              <i class="fas fa-chevron-right chevron"></i>
            </a>
          </li>
          <li>
            <a href="/logout" class="logout-btn" onclick="localStorage.removeItem('vb_user_name'); localStorage.removeItem('vb_user_pic');">
              <span class="icon-circle"><i class="fas fa-sign-out-alt"></i></span>
              <span class="menu-text">Sign Out</span>
              <i class="fas fa-chevron-right chevron"></i>
            </a>
          </li>
        </ul>
      `;
      navMenu.appendChild(li);
    }
  }

  function renderLoggedOut() {
    const loginLinks = document.querySelectorAll('a[href="/signup"], a[href="/login"]');
    loginLinks.forEach(link => {
      if (link.classList.contains('login-btn') || link.querySelector('.login-btn') || link.textContent.trim().toUpperCase() === 'LOG IN') {
        link.style.display = 'inline-block';
      }
    });
    const dropdown = document.getElementById('userDropdown');
    if (dropdown && dropdown.parentElement) {
      dropdown.parentElement.remove();
    }
  }

  // 1. Immediately apply cached state if available (Prevents UI flicker)
  const cachedName = localStorage.getItem('vb_user_name');
  const cachedPic = localStorage.getItem('vb_user_pic');
  if (cachedName && document.body) {
    renderLoggedInUser(cachedName, cachedPic);
  }

  // 2. Refresh from server in the background
  document.addEventListener("DOMContentLoaded", async function () {
    try {
      const res = await fetch('/api/auth-status');
      const data = await res.json();

      if (data.loggedIn && data.name) {
        localStorage.setItem('vb_user_name', data.name);
        if (data.profilePic) localStorage.setItem('vb_user_pic', data.profilePic);
        renderLoggedInUser(data.name, data.profilePic);
      } else {
        localStorage.removeItem('vb_user_name'); localStorage.removeItem('vb_user_pic');;
        renderLoggedOut();
      }
    } catch (err) {
      console.error("Auth check failed", err);
    }
  });
})();

// --- Floating Global Cart ---
document.addEventListener("DOMContentLoaded", function() {
  // Only inject if it doesn't already exist and we're not on the cart page itself
  if (!document.getElementById('global-floating-cart') && !window.location.pathname.toLowerCase().includes('cart')) {
    const floatingCart = document.createElement('a');
    floatingCart.id = 'global-floating-cart';
    floatingCart.href = '/html/modern-cart.html';
    floatingCart.style.cssText = 'position: fixed; bottom: 30px; right: 30px; background: #1b5e20; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 9999; text-decoration: none; transition: transform 0.2s;';
    
    floatingCart.innerHTML = `
      <i class="fas fa-shopping-cart"></i>
      <span class="global-cart-badge" style="position: absolute; top: -5px; right: -5px; background: #ff4757; color: white; border-radius: 50%; padding: 4px 8px; font-size: 14px; font-weight: bold; border: 2px solid white;">0</span>
    `;
    
    // Add hover effect
    floatingCart.onmouseover = () => floatingCart.style.transform = 'scale(1.1)';
    floatingCart.onmouseout = () => floatingCart.style.transform = 'scale(1)';
    
    document.body.appendChild(floatingCart);
  }

  function updateAllCartCounts() {
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('cart')) || [];
    } catch(e) {}
    let totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    document.querySelectorAll('.global-cart-badge, .cart-count').forEach(badge => {
      badge.textContent = totalItems;
    });
  }

  // Update immediately
  updateAllCartCounts();

  // Listen to storage events (cross-tab)
  window.addEventListener('storage', function(e) {
    if (e.key === 'cart') {
      updateAllCartCounts();
    }
  });

  // Intercept Add to Cart clicks to update the global count immediately
  document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart-btn') || e.target.closest('.add-to-cart-btn')) {
      setTimeout(updateAllCartCounts, 100);
    }
  });
});
