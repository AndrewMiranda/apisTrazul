//Inputs formulario de registro 
function verifyInputs(){
    let rolUser = document.getElementsByClassName('rolUser')[0].value;
    let nameUser = document.getElementsByClassName('nameUser')[0].value;
    let userEmail = document.getElementsByClassName('userEmail')[0].value;
    let numberPhone = document.getElementsByClassName('numberPhone')[0].value;
    let message = document.getElementsByClassName('message')[0].value;
    let otherRol = document.getElementsByClassName('otherRol')[0];

    console.log(rolUser, nameUser, userEmail, numberPhone, message);
    if(rolUser != "" && nameUser != "" && userEmail != "" && numberPhone != ""){
        console.log("Todos llenos");
    }else{
        console.log("Faltan campos");
    }

    if(rolUser == "Otro"){
        otherRol.style.display = "block";   
    }else{
        otherRol.style.display = "none";
    }
}

// Cambio del video del heroe
function updateVideoSource() {
    const video = document.getElementsByClassName('sourceVideoPc')[0];
    const source = document.getElementById('videoSource');
    
    if (window.innerWidth <= 600) {
        source.setAttribute('src', '/images/heroeRedAzul-movil1.mp4');
    } else {
        source.setAttribute('src', '/images/heroeRedAzul.mp4');
    }
    video.load();
}

updateVideoSource();
// Llama a la función cuando se cambia el tamaño de la pantalla
window.onresize = updateVideoSource;

// Animaciones
document.addEventListener("DOMContentLoaded", () => {
    const containerFirstSections = document.getElementById("containerFirstSections");

    function checkVisibility() {
        // Primera animación
        let firstAnimation = document.getElementById("firstAnimation");
        const rectfirstAnimation = firstAnimation.getBoundingClientRect();
        console.log(rectfirstAnimation.top);
        if (rectfirstAnimation.top === 70) {
            firstAnimationFunction();
        }

        // Segunda animación
        let sectionSolution = document.getElementById("sectionSolution");
        const rectsectionSolution = sectionSolution.getBoundingClientRect();
        console.log(rectsectionSolution.top);
        if (rectsectionSolution.top === 70) {
            sectionSolutionFunction();
        }
    }
    window.addEventListener("scroll", checkVisibility);
});

// Primera animación
function firstAnimationFunction(){
    let leftTrazul = document.getElementById("leftTrazul");
    let centerTrazul = document.getElementById("centerTrazul");
    let rightTrazul = document.getElementById("rightTrazul");
    let containerSectionTrazul = document.getElementById("containerSectionTrazul")
    let titleSection = document.getElementById('titleTrazul');
    let sectionTrazul = document.getElementsByClassName("sectionTrazul")[0];
    
    const divHeight = containerSectionTrazul.offsetHeight;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const scrolledInsideDiv = window.scrollY - containerSectionTrazul.offsetTop + windowHeight;
    const scrollPercentage = (scrolledInsideDiv / divHeight) * 100;

    const transformValueLeft = ((100 - scrollPercentage) * -1); 
    const transformValueRight = 100 - scrollPercentage;
    
    if(windowWidth > 1000){
        if(scrollPercentage < 55){
            leftTrazul.style.transform = `translateX(-100vw)`;
            rightTrazul.style.transform = `translateX(100vw)`;
            leftTrazul.style.opacity = `0`;
            rightTrazul.style.opacity = `0`;
            centerTrazul.style.transform = `scale(2)`;
            centerTrazul.style.opacity = `0`;
            sectionTrazul.style.position = `sticky`;
            containerSectionTrazul.style.height = `calc((100vh - 70px)* 3)`;
        }else if ( scrollPercentage <= 100) {
            leftTrazul.style.transform = `translateX(${transformValueLeft}%)`;
            rightTrazul.style.transform = `translateX(${transformValueRight}%)`;
            const scaleValue = 2 - ((scrollPercentage - 55) / 45);
            const opacityValue = (scrollPercentage - 55) / 45;
            centerTrazul.style.transform = `scale(${scaleValue})`;
            centerTrazul.style.opacity = `${opacityValue}`;
            titleSection.style.transform = `scale(${scaleValue})`;
            titleSection.style.opacity = `${opacityValue}`;
            leftTrazul.style.opacity = `${opacityValue}`;
            rightTrazul.style.opacity = `${opacityValue}`;
            sectionTrazul.style.position = `sticky`;
            containerSectionTrazul.style.height = `calc((100vh - 70px)* 3)`;
        }
    }else{
        leftTrazul.style.transform = `translateX(0)`;
        rightTrazul.style.transform = `translateX(0)`;
        leftTrazul.style.opacity = `1`;
        rightTrazul.style.opacity = `1`;
        titleSection.style.transform = `scale(1)`;
        titleSection.style.opacity = `1`;
        sectionTrazul.style.position = `initial`;
        containerSectionTrazul.style.height = `auto`;
    }
}

function sectionSolutionFunction(){
    let leftContentSolution = document.getElementById("leftContentSolution");
    let rightContentSolution = document.getElementById("rightContentSolution");
    let benefitsOfTrazul = document.getElementById("benefitsOfTrazul");
    let titleSolution = document.getElementsByClassName('titleSolution')[0];
    let sectionSolution = document.getElementsByClassName('sectionSolution')[0];

    const divHeight = benefitsOfTrazul.offsetHeight;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const scrolledInsideDiv = window.scrollY - benefitsOfTrazul.offsetTop + windowHeight;
    const scrollPercentage = (scrolledInsideDiv / divHeight) * 100;

    const transformValueLeft = ((100 - scrollPercentage) * -1); 
    const transformValueRight = 100 - scrollPercentage;
    if(windowWidth > 1000){
        if(scrollPercentage < 55){
            leftContentSolution.style.transform = `translateX(-100vw)`;
            rightContentSolution.style.transform = `translateX(100vw)`;
            leftContentSolution.style.opacity = `0`;
            rightContentSolution.style.opacity = `0`;
            titleSolution.style.opacity = `0`;
            sectionSolution.style.position = "sticky";
            benefitsOfTrazul.style.height = "calc((100vh - 70px)* 3)";
        }else if ( scrollPercentage <= 100) {
            const opacityValue = (scrollPercentage - 55) / 45;
            leftContentSolution.style.transform = `translateX(${transformValueLeft}%)`;
            rightContentSolution.style.transform = `translateX(${transformValueRight}%)`;
            leftContentSolution.style.opacity = `${opacityValue}`;
            rightContentSolution.style.opacity = `${opacityValue}`;
            titleSolution.style.opacity = `${opacityValue}`;
            sectionSolution.style.position = "sticky";
            benefitsOfTrazul.style.height = "calc((100vh - 70px)* 3)";
        }
    }else{
        leftContentSolution.style.transform = `translateX(0)`;
        rightContentSolution.style.transform = `translateX(0)`;
        leftContentSolution.style.opacity = "1";
        rightContentSolution.style.opacity = "1";
        titleSolution.style.opacity = "1";
        sectionSolution.style.position = "initial";
        benefitsOfTrazul.style.height = "auto";
    }
    


}

// let scrollY = 0;
// let targetScrollY = 0;

// const smoothScroll = () => {
//     targetScrollY = window.scrollY; // Captura el desplazamiento del usuario
//     scrollY += (targetScrollY - scrollY) * 0.1; // Inercia para suavidad

//     document.querySelector(".scroll-container").style.transform = `translateY(-${scrollY}px)`;

//     requestAnimationFrame(smoothScroll);
// };

// smoothScroll();


document.addEventListener("DOMContentLoaded", () => {
    const scrollContainer = document.querySelector("body"); // Cambia el selector si necesitas aplicar a un contenedor específico

    let isScrolling = false; // Controla si ya está en proceso de desplazamiento

    scrollContainer.addEventListener("scroll", (event) => {
        event.preventDefault(); // Previene el desplazamiento predeterminado

        if (isScrolling) return; // Si ya está desplazándose, evita superposiciones

        isScrolling = true;

        const scrollStep = 100; // Define cuánto se desplaza por cada paso del scroll
        const scrollDirection = event.deltaY > 0 ? 1 : -1; // Determina la dirección del scroll
        const targetScroll = scrollContainer.scrollTop + scrollStep * scrollDirection;

        // Suaviza el desplazamiento usando `window.scrollTo` con `behavior: smooth`
        scrollContainer.scrollTo({
            top: targetScroll,
            behavior: "smooth"
        });

        // Permite iniciar un nuevo desplazamiento después de que termine el actual
        setTimeout(() => {
            isScrolling = false;
        }, 300); // Ajusta el tiempo según el efecto deseado
    }, { passive: false });
});