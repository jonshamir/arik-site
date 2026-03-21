(function () {
  var PAGE_SIZE = 10;

  var containers = document.querySelectorAll(".papers-list, .category-page");

  containers.forEach(function (container) {
    var cards = Array.from(container.querySelectorAll(".paper-card"));
    if (cards.length <= PAGE_SIZE) return;

    var totalPages = Math.ceil(cards.length / PAGE_SIZE);
    var currentPage = 1;

    var hashMatch = location.hash.match(/page=(\d+)/);
    if (hashMatch) {
      var parsed = parseInt(hashMatch[1], 10);
      if (parsed >= 1 && parsed <= totalPages) currentPage = parsed;
    }

    var nav = document.createElement("nav");
    nav.className = "pagination";
    nav.setAttribute("aria-label", "Page navigation");
    container.appendChild(nav);

    function render() {
      cards.forEach(function (card, i) {
        var page = Math.floor(i / PAGE_SIZE) + 1;
        card.style.display = page === currentPage ? "" : "none";
      });

      nav.innerHTML = "";

      var prevBtn = document.createElement("button");
      prevBtn.className = "pagination-btn";
      prevBtn.innerHTML = '<i class="ph ph-caret-left"></i> Prev';
      prevBtn.disabled = currentPage === 1;
      prevBtn.addEventListener("click", function () {
        goToPage(currentPage - 1);
      });
      nav.appendChild(prevBtn);

      var pageNums = document.createElement("span");
      pageNums.className = "pagination-pages";
      buildPageNumbers(currentPage, totalPages).forEach(function (p) {
        if (p === "...") {
          var ellipsis = document.createElement("span");
          ellipsis.className = "pagination-ellipsis";
          ellipsis.textContent = "\u2026";
          pageNums.appendChild(ellipsis);
        } else {
          var btn = document.createElement("button");
          btn.className =
            "pagination-num" + (p === currentPage ? " active" : "");
          btn.textContent = p;
          btn.addEventListener(
            "click",
            (function (page) {
              return function () {
                goToPage(page);
              };
            })(p)
          );
          pageNums.appendChild(btn);
        }
      });
      nav.appendChild(pageNums);

      var nextBtn = document.createElement("button");
      nextBtn.className = "pagination-btn";
      nextBtn.innerHTML = 'Next <i class="ph ph-caret-right"></i>';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.addEventListener("click", function () {
        goToPage(currentPage + 1);
      });
      nav.appendChild(nextBtn);

      var info = document.createElement("div");
      info.className = "pagination-info";
      var startItem = (currentPage - 1) * PAGE_SIZE + 1;
      var endItem = Math.min(currentPage * PAGE_SIZE, cards.length);
      info.textContent =
        "Showing " + startItem + "\u2013" + endItem + " of " + cards.length;
      nav.appendChild(info);
    }

    function goToPage(page) {
      if (page < 1 || page > totalPages) return;
      currentPage = page;
      history.replaceState(null, "", "#page=" + page);
      render();
      container.scrollIntoView({ behavior: "instant", block: "start" });
    }

    function buildPageNumbers(current, total) {
      if (total <= 7)
        return Array.from({ length: total }, function (_, i) {
          return i + 1;
        });
      var pages = [1];
      if (current > 3) pages.push("...");
      for (
        var i = Math.max(2, current - 1);
        i <= Math.min(total - 1, current + 1);
        i++
      ) {
        pages.push(i);
      }
      if (current < total - 2) pages.push("...");
      pages.push(total);
      return pages;
    }

    render();

    window.addEventListener("hashchange", function () {
      var match = location.hash.match(/page=(\d+)/);
      if (match) {
        var p = parseInt(match[1], 10);
        if (p >= 1 && p <= totalPages && p !== currentPage) {
          currentPage = p;
          render();
        }
      }
    });
  });
})();
