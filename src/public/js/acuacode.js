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
        
    let data = await fetch(urlApi+"/productiveUnits/batches/traceability?token="+codigoLoteCompleto, {
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
    
    const datosTrazabilidad = {
        ubicacion: 'Alguna ubicación',
        fecha: '2024-04-08',
        detalles: ['Detalle 1', 'Detalle 2', 'Detalle 3']
    };
    
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

    // Agregar el icono de marcador personalizado
    var icon = L.icon({
        iconUrl: '/IMAGES/LocationIcon.png',
        iconSize: [64, 64],
        iconAnchor: [32, 32]
    });

    // Actualizar la lista de datos de trazabilidad
    const datosList = document.getElementById('datosTrazabilidad');
    datosList.innerHTML = '';
    data.traceability.forEach(item => {
        
        if (item.type == 1) {
            console.log(item.body.coords);

            coords = item.body.coords;
            coords = coords.split(",");

            // Se agrega el marcador en el mapa
            L.marker([coords[1], coords[0]], { icon: icon }).addTo(map);

            map.flyTo([coords[1], coords[0]], 13);
        }
        
        item = JSON.stringify(item);;

        const li = document.createElement('li');
        li.textContent = item;
        datosList.appendChild(li);
    });
}