function loadHeader(activePage) {
    fetch("header-menu.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("header-placeholder").innerHTML = data;
            document.querySelector(`.nav a[href="${activePage}"]`)?.classList.add("active");
        })
        .catch(error => console.error("Failed to load header", error));
}
