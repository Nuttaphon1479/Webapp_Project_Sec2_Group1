// Script navbar
// function myFunction() {
//     var x = document.getElementById("myLinks");
//     if (x.style.display === "block") {
//         x.style.display = "none";
//     } else {
//         x.style.display = "block";
//     }
// }

// Load navbar to UI
fetch('/views/navbar/navbar1.html') // ให้แทนที่ "/path/to/navbar.html" ด้วยที่อยู่ของไฟล์ Navbar บนเซิร์ฟเวอร์
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar-container1').innerHTML = data;
    })
    .catch(error => {
        console.error('Error loading Navbar:', error);
    });

fetch('/views/navbar/navbar2.html') // ให้แทนที่ "/path/to/navbar.html" ด้วยที่อยู่ของไฟล์ Navbar บนเซิร์ฟเวอร์
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar-container2').innerHTML = data;
    })
    .catch(error => {
        console.error('Error loading Navbar:', error);
    });

fetch('/views/navbar/navbar3.html') // ให้แทนที่ "/path/to/navbar.html" ด้วยที่อยู่ของไฟล์ Navbar บนเซิร์ฟเวอร์
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar-container3').innerHTML = data;
    })
    .catch(error => {
        console.error('Error loading Navbar:', error);
    });
