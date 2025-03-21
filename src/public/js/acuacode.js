function checkCode() {
    if (codeGet != "") {
        codeGetParsed = codeGet.split("-");

        if (codeGetParsed.length == 5) {
            for (let index = 0; index < codeGetParsed.length; index++) {
                const element = codeGetParsed[index];

                let iterator = index+1;
                
                document.getElementById('batchCodeSection'+iterator).value = element;
            }

            getTraceability();
        }else{
            alert(`El código "${codeGet}" no es válido.`);
        }
    }
}

const overlay = document.getElementById('overlay');
const loader = document.getElementById('loader');
const buttonConsultar = document.getElementById('formButton');
var map = document.getElementById("map");
const traceabilityBox = document.getElementById("datosTrazabilidad");
const trazabilidadForm = document.getElementById("trazabilidadForm");
const container = document.getElementById("container");
const title = document.getElementById("title");

async function getTraceability() {
    const codigoLote1 = document.getElementById('batchCodeSection1').value;
    const codigoLote2 = document.getElementById('batchCodeSection2').value;
    const codigoLote3 = document.getElementById('batchCodeSection3').value;
    const codigoLote4 = document.getElementById('batchCodeSection4').value;
    const codigoLote5 = document.getElementById('batchCodeSection5').value;

    let codigoLoteCompleto = codigoLote1+"-"+codigoLote2+"-"+codigoLote3+"-"+codigoLote4+"-"+codigoLote5;

    console.log(codigoLoteCompleto);

    // Deshabilitar botón de consulta
    buttonConsultar.disabled = true;

    // Mostrar overlay y loader
    overlay.style.display = 'block';
    loader.style.display = 'block';

    console.log(urlApi+"/productiveUnits/batches/traceability?token="+codigoLoteCompleto)
        
    let data = await fetch(urlApi+"/productiveUnits/batches/acuacode?token="+codigoLoteCompleto, {
        method: 'GET',
        headers: { "Authorization": "6229aa5938617a240792ef1c4359779d" }
    }).then(async response => { 
        if (response.ok) {
            let data = await response.json();

            trazabilidadForm.remove();
            
            container.classList.remove("container");

            container.classList.add("postContainer");

            map.classList.remove("data-hidden");

            traceabilityBox.classList.remove("data-hidden");

            title.innerText = `Trazabilidad del lote: ${codigoLoteCompleto}`;

            return data;
        } else {
            alert(await response.json())
        }
    }).catch(err => {   
        console.log(err);
        alert(err);
    }).finally(function () {
        // Deshabilitar botón de consulta
        buttonConsultar.disabled = false;

        overlay.style.display = 'none';
        loader.style.display = 'none';
    });

    console.log(data);
    
    // const datosTrazabilidad = {
    //     ubicacion: 'Alguna ubicación',
    //     fecha: '2024-04-08',
    //     detalles: ['Detalle 1', 'Detalle 2', 'Detalle 3']
    // };
    
    // Actualizar el mapa
    map = L.map('map', {zoomControl: false, scrollWheelZoom: "center"}).setView([4.665388, -74.081734], 13);

    // Crear capa Opem Street Map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributor'
    }).addTo(map);

    // Crear control de zoom personalizado
    L.control.zoom({
        position: 'topright', // Cambiar la posición del control de zoom ('topleft', 'topright', 'bottomleft', 'bottomright')
    }).addTo(map);

    // Agregar iconos de marcadores personalizados
    var iconAlevinos = L.icon({
        iconUrl: '/images/TrAzul-ICOs-Alevinera.png',
        iconSize: [24, 24],
        iconAnchor: [16, 16]
    });

    var iconEngorde = L.icon({
        iconUrl: '/images/TrAzul-ICOs-Engorde.png',
        iconSize: [24, 24],
        iconAnchor: [16, 16]
    });


    // Actualizar la lista de datos de trazabilidad
    const datosList = document.getElementById('datosTrazabilidad');
    datosList.innerHTML = '';

    length = data.traceability;
    length = length.length;

    points = [];
    usedPoints = [];

    data.traceability.forEach((item, index) => {
        console.log(item);

        // Objetos HTML
        const li = document.createElement('li');
        const ico = document.createElement('img');
        const title = document.createElement('p');
        const text = document.createElement('p');

        // Agregar icono
        var icoName = "";
        var titleText = "";

        // Se agrega el punto en el mapa
        let coords = item.data[0].body.coords;
        coords = coords.split(",");

        nextRepeated = false;

        let nextIndex = index+1;

        if (nextIndex >= length) {
            nextIndex =  0;
        }else{
            nextIndex = data.traceability[nextIndex].type;
        }
        
        // Se verifica si el type siguiente es igual
        if (item.type == nextIndex) {
            nextRepeated = true;
        }

        // Condicional temporal para convertir tipo 2 y 3 a 1
        if (item.type == 2 || item.type == 3) {
            item.type = 1;
        }

        switch (item.type) {
            case 1:
                icoName = "TrAzul-ICOs-Alevinera.png";

                if (nextRepeated == false) {
                    titleText = "Lote de alevinos: "+item.data[0].body.serial;
                }else{
                    titleText = "Lotes de alevinos";
                }

                // Se agrega el marcador en el mapa
                L.marker([coords[1], coords[0]], { icon: iconAlevinos }).addTo(map);

                map.flyTo([coords[1], coords[0]], 13);

                points.push([coords[1], coords[0]]);
                usedPoints.push([coords[1], coords[0]]);

                break;
            case 2: 
                icoName = "padrotes3.png";
                titleText = "Lote padre";
                break;
            case 3:
                icoName = "TrAzul-ICO-Code-Lote-Derivado.png";
                titleText = "Lote derivado o mezclado";
                break;
            case 4:
                icoName = "TrAzul-ICOs-Engorde.png";
                titleText = "Lote de engorde";
                
                // Se agrega el marcador en el mapa
                L.marker([coords[1], coords[0]], { icon: iconEngorde }).addTo(map);

                // Se guardan las coordenadas para la ruta
                points.push([coords[1], coords[0]]);

                // Se extrae la coordenada anterior
                var pointsLine = [points[0], points[1]];

                console.log(pointsLine);

                // Crea la polilínea que conecta los dos puntos
                L.polyline(pointsLine, {color: 'red'}).addTo(map);
                
                break;
            case 5:
                icoName = "TrAzul-ICOs-Transporte.png";
                titleText = "Despachado a";
                break;
            case 6:
                icoName = "transporte.png";
                titleText = "Lote completo";
                break;
            default:
                icoName = "padrotes3.png";
                titleText = "Lote completo";
                break;
        }

        item = JSON.stringify(item.data);

        text.textContent = item;

        // Primer Div para icono y titulo y Segundo div para subContenidox
        const mainDiv = document.createElement('div');
        mainDiv.classList.add("mainDiv");
        const subDiv = document.createElement('div');

        // Agregar ícono
        ico.src = "./images/"+icoName;
        mainDiv.appendChild(ico);

        // Agregar título
        title.textContent = titleText;
        title.classList.add("itemTitle");
        mainDiv.appendChild(title);

        // Agregar texto
        text.classList.add("data-hidden");
        text.id = "subItem-"+index;
        text.dataset.toogle = 0;
        subDiv.appendChild(text);

        // Se agrega el id
        li.id = "item-"+index;

        // Se agrega el onclick
        li.onclick = function() {
            openItem(index);
        };

        // Se adjuntan los divs
        li.appendChild(mainDiv);
        li.appendChild(subDiv);
        
        // Se inserta el item en el body
        datosList.appendChild(li);

        // Se verifica que el elemento no sea el último
        if (index < length-1) {
            // Se crea y se inserta el ícono de flecha
            const nextArrow = document.createElement('img');
            nextArrow.src = "images/flecha-hacia-abajo.png"
            nextArrow.classList.add("arrowNext");

            datosList.appendChild(nextArrow);
        }
    });
}

function openItem(item) {
    let subItem = document.getElementById("subItem-"+item);

    if (subItem.dataset.toogle == 1) {
        subItem.classList.add("data-hidden");
        subItem.dataset.toogle = 0;
    }else{
        subItem.classList.remove("data-hidden");
        subItem.dataset.toogle = 1;
    }
}

// TB-2-4-EMI089-2409281207

// TB-13-1-e1EdCv-2409280008


function goDecription(){
    const codigoLote1 = document.getElementById('batchCodeSection1').value;
    const codigoLote2 = document.getElementById('batchCodeSection2').value;
    const codigoLote3 = document.getElementById('batchCodeSection3').value;
    const codigoLote4 = document.getElementById('batchCodeSection4').value;
    const codigoLote5 = document.getElementById('batchCodeSection5').value;

    if(codigoLote1 != "" && codigoLote2 != "" && codigoLote3 != "" && codigoLote4 != "" && codigoLote5 != ""){
        let codigoLoteCompleto = codigoLote1+"-"+codigoLote2+"-"+codigoLote3+"-"+codigoLote4+"-"+codigoLote5;

        console.log(codigoLoteCompleto);

        window.location.href = `/acuacode/${codigoLoteCompleto}`;
    }
}