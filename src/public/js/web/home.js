let statusMenu = 0;
function hamburgermenufunction(){
    let menu = document.getElementById('imageMenu');
    let containerMenu = document.getElementById('hamburgerMenu');

    if(statusMenu == 0){
        menu.src = '/images/menuOpenBlue.svg'
        containerMenu.style.marginRight =  '0'
        statusMenu = 1;
    }else{
        menu.src = '/images/menuBlue.svg'
        containerMenu.style.marginRight =  '-115%'
        statusMenu = 0;
    }
}


// scrool header
let lastScrollTop = 0;
function checkScroll(){
    let windowHeight = window.innerHeight;
    let scrollPosition = window.scrollY;
    let divide = windowHeight / 2;

    let containerOptionHeader = document.getElementsByTagName('header')[0];
    let optionHeader = document.querySelectorAll('optionHeader');

    if(scrollPosition  >= 1){
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll > lastScrollTop) {
            containerOptionHeader.style.top = "-120px";
            
            if(containerOptionHeader.classList.contains("generalShadow")){
                containerOptionHeader.classList.remove("generalShadow")
            }
            
        }else {
            containerOptionHeader.style.top = "0px";
            containerOptionHeader.style.backgroundColor = "#FFFFFF";
            containerOptionHeader.classList.add("generalShadow");
            containerOptionHeader.style.position = "fixed";
            document.querySelectorAll('.optionHeader').forEach(function(element) {
                element.style.color = '#005fae'; // Cambia el color del texto a rojo
            });
        }
    }
}

window.addEventListener('scroll', checkScroll, false);