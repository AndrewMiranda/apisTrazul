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