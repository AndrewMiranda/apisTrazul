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
        source.setAttribute('src', '/images/heroeRedAzul2.mp4');
    } else {
        source.setAttribute('src', '/images/heroeRedAzul2.mp4');
    }
    video.load();
}

// updateVideoSource();
// Llama a la función cuando se cambia el tamaño de la pantalla
// window.onresize = updateVideoSource;

// Animaciones
document.addEventListener("DOMContentLoaded", () => {
    const containerFirstSections = document.getElementById("containerFirstSections");
    const windowWidth = window.innerWidth;
    if(windowWidth > 1000){
        function checkVisibility() {
            // Primera animación
            let firstAnimation = document.getElementById("firstAnimation");
            let heightfirst = document.documentElement.clientHeight; 
            let percentageHeight = heightfirst * 0.9;
            const rectfirstAnimation = firstAnimation.getBoundingClientRect();
            // console.log(heightfirst);
            // console.log(rectfirstAnimation.top);
            // console.log(rectfirstAnimation.bottom);
            if (rectfirstAnimation.top <= window.innerHeight * 0.9  || rectfirstAnimation.top === 70) {
                firstAnimationFunction();
            }

            // Segunda animación
            let sectionSolution = document.getElementById("sectionSolution");
            const rectsectionSolution = sectionSolution.getBoundingClientRect();
            if (rectsectionSolution.top <= window.innerHeight * 0.9 || rectsectionSolution.top === 70) {
                sectionSolutionFunction();
            }
        }
    }else{
        let sectionTrazul = document.getElementsByClassName("sectionTrazul")[0];
        let containerSectionTrazul = document.getElementById("containerSectionTrazul")
        sectionTrazul.style.position = `initial`;
        containerSectionTrazul.style.height = `auto`;

        let sectionSolution = document.getElementsByClassName('sectionSolution')[0];
        let benefitsOfTrazul = document.getElementById("benefitsOfTrazul");
        sectionSolution.style.position = "initial";
        benefitsOfTrazul.style.height = "auto";
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
        console.log(scrollPercentage);
        if(scrollPercentage < 10){
            leftTrazul.style.transform = `translateX(-100vw)`;
            rightTrazul.style.transform = `translateX(100vw))`;
            leftTrazul.style.opacity = `0`;
            rightTrazul.style.opacity = `0`;
            centerTrazul.style.transform = `scale(2)`;
            centerTrazul.style.opacity = `0`;
            sectionTrazul.style.position = `sticky`;
            containerSectionTrazul.style.height = `calc((100vh - 70px)* 2)`;
        }else if ( scrollPercentage <= 100) {
            leftTrazul.style.transform = `translateX(${transformValueLeft}%)`;
            rightTrazul.style.transform = `translateX(${transformValueRight}%)`;
            const scaleValue = 2 - ((scrollPercentage - 10) / 90);
            const opacityValue = (scrollPercentage - 10) / 90;
            centerTrazul.style.transform = `scale(${scaleValue})`;
            centerTrazul.style.opacity = `${opacityValue}`;
            titleSection.style.transform = `scale(${scaleValue})`;
            titleSection.style.opacity = `${opacityValue}`;
            leftTrazul.style.opacity = `${opacityValue}`;
            rightTrazul.style.opacity = `${opacityValue}`;
            sectionTrazul.style.position = `sticky`;
            containerSectionTrazul.style.height = `calc((100vh - 70px)* 2)`;
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
        if(scrollPercentage < 10){
            leftContentSolution.style.transform = `translateX(-80vw)`;
            rightContentSolution.style.transform = `translateX(800vw)`;
            leftContentSolution.style.opacity = `0.3`;
            rightContentSolution.style.opacity = `0.3`;
            titleSolution.style.opacity = `0`;
            sectionSolution.style.position = "sticky";
            benefitsOfTrazul.style.height = "calc((100vh - 70px)* 2)";
        }else if ( scrollPercentage <= 100) {
            const opacityValue = (scrollPercentage - 10) / 90;
            leftContentSolution.style.transform = `translateX(${transformValueLeft}%)`;
            rightContentSolution.style.transform = `translateX(${transformValueRight}%)`;
            leftContentSolution.style.opacity = `${opacityValue}`;
            rightContentSolution.style.opacity = `${opacityValue}`;
            titleSolution.style.opacity = `${opacityValue}`;
            sectionSolution.style.position = "sticky";
            benefitsOfTrazul.style.height = "calc((100vh - 70px)* 2)";
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

function validadeInputs(nameInput){

    let input = document.getElementsByName(nameInput)[0];
    if(!Number.isInteger(parseInt(input.value))){
        console.log('Invalid');
        input.setAttribute('valid-input', false);
    }else{
        console.log('Valid');
        input.setAttribute('valid-input', true);
    }

    let numberProductiveUnit = document.getElementById("numberProductiveUnit").getAttribute("valid-input");
    let estanques = document.getElementById("estanques").getAttribute("valid-input");
    let usuarios = document.getElementById("usuarios").getAttribute("valid-input");

    if(numberProductiveUnit == "true" && estanques == "true" && usuarios == "true"){
        let calculateform = document.getElementById("calculateform");

        calculateform.setAttribute("onclick", "calculatePrecio()");
        calculateform.style.backgroundColor = "#FFFFFF";
        calculateform.style.color = "#3194D2";
        calculateform.style.border = "1px solid #3194d2";
        calculateform.style.fontWeight = "bold";
        calculateform.style.cursor = "pointer";
    }else{
        calculateform.setAttribute("onclick", "");
        calculateform.style.backgroundColor = "#A2A2A2";
        calculateform.style.color = "#FFFFFF";
        calculateform.style.border = "none";
        calculateform.style.cursor = "auto";
    }
}

function calculatePrecio(){
    let responseCalculator = document.getElementsByClassName("responseCalculator")[0];
    let unidadesProductivas = document.getElementById("numberProductiveUnit").value;
    let estanques = document.getElementById("estanques").value;
    let usuarios = document.getElementById("usuarios").value;
    let titlePrefectPlan = document.getElementById("titlePrefectPlan");
    let pricePerfectPlan = document.getElementById("pricePerfectPlan");
    let spanNumberEstanques = document.getElementById("spanNumberEstanques");
    let spanNumberUsuarios = document.getElementById("spanNumberUsuarios");
    let spanNumberUnidades = document.getElementById("spanNumberUnidades");
    let priceEstanques = document.getElementById("priceEstanques");
    let priceUsuarios = document.getElementById("priceUsuarios");
    let priceUnidad = document.getElementById("priceUnidad");
    let totalPlan = document.getElementById("totalPlan");
    let cardPerfectPlan = document.getElementsByClassName("cardPerfectPlan")[0]; //

    let overlay = document.getElementById("overlay");

    const planes = [
        { nombre: "Básico", precio: 75000, estanques: 1, usuarios: 1, unidadesProductivas: 1 },
        { nombre: "Platino", precio: 130000, estanques: 3, usuarios: 3, unidadesProductivas: 1 },
        { nombre: "Oro", precio: 370000, estanques: 10, usuarios: Infinity, unidadesProductivas: 2 },
    ];    
    
      // Adicionales
    const preciosAdicionales = {
        estanque: 50000,
        usuario: 15000,
        unidadProductiva: 50000,
    };
    
    // Determinar el plan más económico
    let mejorOpcion = null;

    for (const plan of planes) {
        const resultado = calcularCosto(plan, estanques, usuarios, unidadesProductivas, preciosAdicionales);

        if (!mejorOpcion || resultado.costoTotal < mejorOpcion.costoTotal) {
            mejorOpcion = {
            plan: plan.nombre,
            precioPlan: plan.precio,
            adicionales: resultado.adicionales,
            costoAdicionales: resultado.costoTotal - plan.precio,
            costoTotal: resultado.costoTotal,
            };
        }
    }

    // Formatear como moneda
    const formateadorMoneda = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    });
    
    let precioSeleccionado = formateadorMoneda.format(mejorOpcion.precioPlan);

    titlePrefectPlan.innerHTML = `Plan ${mejorOpcion.plan}`;
    pricePerfectPlan.innerHTML = `${precioSeleccionado} mensuales`;

    spanNumberEstanques.innerHTML = `✓ ${mejorOpcion.adicionales.estanques} estanques adicionales`;
    spanNumberUsuarios.innerHTML = `✓ ${mejorOpcion.adicionales.usuarios} usuarios adicionales`;
    spanNumberUnidades.innerHTML = `✓ ${mejorOpcion.adicionales.unidadesProductivas} unidades productivas`;

    let adicionalEstanquesPrice = mejorOpcion.adicionales.estanques * 50000;
    let adicionalesUsuariosPrice = mejorOpcion.adicionales.usuarios * 15000;
    let adicionalesUnidadesPrice = mejorOpcion.adicionales.unidadesProductivas * 50000;
    let totalPerfectPlan = adicionalesUnidadesPrice + adicionalesUsuariosPrice + adicionalEstanquesPrice + mejorOpcion.precioPlan;

    priceEstanques.innerHTML = `${formateadorMoneda.format(adicionalEstanquesPrice)}`;
    priceUsuarios.innerHTML = `${formateadorMoneda.format(adicionalesUsuariosPrice)}`;
    priceUnidad.innerHTML = `${formateadorMoneda.format(adicionalesUnidadesPrice)}`;

    totalPlan.innerHTML = `${ formateadorMoneda.format(totalPerfectPlan) }`;

    if(mejorOpcion.plan === 'Básico'){
        cardPerfectPlan.style.backgroundColor = '#e4e2e2';
    }else if(mejorOpcion.plan === 'Platino'){
        cardPerfectPlan.style.backgroundColor = '#cceff8';
    }else if(mejorOpcion.plan === 'Oro'){
        cardPerfectPlan.style.backgroundColor = '#fef4bb    ';
    }

    overlay.style.display = "none";
}

// Función para calcular el costo total de un plan con adicionales
function calcularCosto(plan, estanques, usuarios, unidadesProductivas, preciosAdicionales) {
    const adicionales = {
        estanques: Math.max(0, estanques - plan.estanques),
        usuarios: Math.max(0, usuarios - plan.usuarios),
        unidadesProductivas: Math.max(0, unidadesProductivas - plan.unidadesProductivas),
    };

    const costoAdicionales =
        adicionales.estanques * preciosAdicionales.estanque +
        adicionales.usuarios * preciosAdicionales.usuario +
        adicionales.unidadesProductivas * preciosAdicionales.unidadProductiva;

    return {
        costoTotal: plan.precio + costoAdicionales,
        adicionales,
    };

}


let numberSliders = 3;
let actualSlider = 1;
let percentage = 0;
function leftSlider() {
    let divTransition = document.getElementById('divTransition');
    let subtitleTransition = document.getElementById('subtitleTransition');
    if(percentage >= 100){
        percentage = percentage - 100;
        divTransition.style.marginLeft = `-${percentage}%`;
        subtitleTransition.style.marginLeft = `-${percentage}%`;
        actualSlider = actualSlider - 1;
    }else{
        percentage = (numberSliders - 1) * 100;
        divTransition.style.marginLeft = `-${percentage}%`;
        subtitleTransition.style.marginLeft = `-${percentage}%`;
        actualSlider = numberSliders - 1;
    }

    changueTitle();
}

function rightSlider() {
    let divTransition = document.getElementById('divTransition');
    let subtitleTransition = document.getElementById('subtitleTransition');
    if(numberSliders > actualSlider) {
        
        percentage = actualSlider * 100;
        divTransition.style.marginLeft = `-${percentage}%`;
        subtitleTransition.style.marginLeft = `-${percentage}%`;
        actualSlider = actualSlider + 1;
    }else{
        
        actualSlider = 1;
        percentage = 0;
        divTransition.style.marginLeft = `0%`;
        subtitleTransition.style.marginLeft = `0%`;
    }
    // changueTitle();
}


function changueTitle() {
    let subtitleSlider = document.getElementById('subtitleSlider');
    if(actualSlider == 1){
        subtitleSlider.innerHTML = "Puedes ver los lotes que has creado, registrar la <b class='bSubtitleEslider'>mortalidad</b> de tus lotes, <b class='bSubtitleEslider'>insumos</b>, <b class='bSubtitleEslider'>biomasa</b>, <b class='bSubtitleEslider'>alimento</b>, <b class='bSubtitleEslider'>medicamentos</b>, entre otros."
        subtitleSlider.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    }else if(actualSlider == 2){
        subtitleSlider.innerHTML = "Puedes vincular a tus <b class='bSubtitleEslider'> trabajadores </b> en la unidad productiva para que registren sus actividades diarias, además de llevar un registro diario de los <b class='bSubtitleEslider'> ingresos y egresos </b>."
        subtitleSlider.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
    }else{
        subtitleSlider.innerHTML = "Puedes registrar tus <b class='bSubtitleEslider'> insumos  </b> y <b class='bSubtitleEslider'> vincularlos </b> a los lotes correspondientes diariamente conforme los utilices."
        subtitleSlider.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    }
}

function sendContactFunction(event){
    event.preventDefault();

    let formContact = document.getElementById("formContact");
    let formData = new FormData(formContact);

    console.log(formData);
    
    
    fetch(`https://${urlApi}/apis/${version}/general/contactForm`, {
        method: 'POST',
        body: formData
    }).then((response) => {

        console.log(response);
        if(response.status === 200) {
            return response.json().then(data => {                
                launchalert('success', 'Formulario enviado correctamente', 'Pronto nos pondremos en contacto contigo', '', 'Aceptar', '', 'alertmodalcomponentclose');
            });
            
        }else{
            return response.json().then(errorData => {
                // console.log(JSON.parse(errorData))
                launchalert('infoAlert', `${errorData['error']['error']}`, '', '', 'Aceptar', '', 'alertmodalcomponentclose');
            });
        }
    })
    .catch(err => {
        console.log(err)
    });
}



window.onresize = onresizeFunctions;
    window.onload = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        updateVideoSource();
        loader();
    }
window.addEventListener('resize', function(){
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    loader();
}, true)

function onresizeFunctions(){
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // loader();

}
// let contenedor = document.getElementById('containerLoad');
// function loader(){
//     contenedor.remove();

// }