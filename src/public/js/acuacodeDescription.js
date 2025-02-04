document.addEventListener("DOMContentLoaded", function() {
    console.log("La vista ha cargado");
    miFuncion();
});


async function miFuncion() {
    let titleAcuacode  = document.getElementsByClassName("titleAcuacode")[0];
    let map = document.getElementById("map");
    console.log("dsdfds", codeGet);

    console.log(urlApi+"/productiveUnits/batches/traceability?token="+codeGet)
        
    let data = await fetch(urlApi+"/productiveUnits/batches/acuacode?token="+codeGet, {
        method: 'GET',
        headers: { "Authorization": "6229aa5938617a240792ef1c4359779d" }
    }).then(async response => { 
        if (response.ok) {
            let data = await response.json();

            titleAcuacode.innerText = `Trazabilidad del lote: ${codeGet}`;

            return data;
        }
    });

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

    let transportAlevinos = false;

    points = [];
    usedPoints = [];

    data.traceability.forEach((item, index) => {
        // console.log(item);
        // Agregar icono
        var icoName = "";
        var titleText = "";
        var specie = "";
        var quantity = "";
        var functionName = "";

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
                    titleText = `Lote de alevinos ${ item.data[0].body.serial}`;
                    specie = `<b>Especie:</b> ${item.data[0].body.specie}`;
                    functionName = () => modalDetailsAlevinos(item.data[0].body);
                    if(item.data[0].body.sowingDate){
                        quantity = `<b>Fecha de siembra:</b> ${item.data[0].body.sowingDate.split('T')[0]}`;
                    }else{
                        quantity = `<b>Fecha de siembra:</b>`;
                    }

                    if(item.data[0].body.dispatches && item.data[0].body.dispatches != []){
                        transportAlevinos = true;
                    }else{
                        transportAlevinos = false;
                    }
                    
                }else{
                    titleText = item.data[0].body.serial;
                    specie = item.data[0].body.specie;
                    quantity = item.data[0].body.quantityFish;
                }

                L.marker([coords[1], coords[0]], { icon: iconAlevinos }).addTo(map);

                map.flyTo([coords[1], coords[0]], 13);

                points.push([coords[1], coords[0]]);
                usedPoints.push([coords[1], coords[0]]);

                break;
                
            case 2: 
                icoName = "padrotes3.png";
                titleText = "Lote padre";
                transportAlevinos = false;
                break;
            case 3:
                icoName = "TrAzul-ICO-Code-Lote-Derivado.png";
                titleText = "Lote derivado o mezclado";
                transportAlevinos = false;
                break;
            case 4:
                icoName = "TrAzul-ICOs-Engorde.png";
                titleText = "Lote de engorde";
                specie = `<b>Numero de alevinos:</b> ${item.data[0].body.quantityFish}`;
                quantity = `<b>Fecha de siembra:</b> ${item.data[0].body.sowingDate.split(' ')[0]}`;
                
                // Se agrega el marcador en el mapa
                L.marker([coords[1], coords[0]], { icon: iconEngorde }).addTo(map);

                // Se guardan las coordenadas para la ruta
                points.push([coords[1], coords[0]]);

                // Se extrae la coordenada anterior
                var pointsLine = [points[0], points[1]];

                console.log(pointsLine);

                // Crea la polilínea que conecta los dos puntos
                L.polyline(pointsLine, {color: '#0071BC'}).addTo(map);
                

                transportAlevinos = false;                
                break;
            case 5:
                icoName = "TrAzul-ICOs-Transporte.png";
                titleText = "Despachado a";
                transportAlevinos = false;
                break;
            case 6:
                icoName = "transporte.png";
                titleText = "Lote completo";
                transportAlevinos = false;
                break;
            default:
                icoName = "padrotes3.png";
                titleText = "Lote completo";
                transportAlevinos = false;
                break;
        }

        let timeLineOptions = document.getElementsByClassName("timeLineOptions")[0];
        let cardLine = document.createElement("div");
        cardLine.setAttribute("class", "iconsTimeLine");
        cardLine.innerHTML = `
            <div class="containerIcon">
                <img class="imgTimeLine" src="/images/${icoName}" alt="">
                <div class="cardTimeLine">
                    <div class="infoCard generalShadow">
                        <h3>${titleText}</h3>
                        <p>${specie}</p>
                        <p>${quantity}</p>
                        <div  class="seeMore" onclick="${functionName}">Ver mas.</div>
                    </div>
                    <img src="/images/poligono.svg" alt="">
                </div>
            </div>
            <div class="line"></div>
        `
        cardLine.querySelector(".seeMore").addEventListener("click", functionName);
        timeLineOptions.appendChild(cardLine);

        if(transportAlevinos){
            let cardLineTransport = document.createElement("div");
            cardLineTransport.setAttribute("class", "iconsTimeLine");
            cardLineTransport.innerHTML = `
                <div class="containerIcon">
                    <img class="imgTimeLine" src="/images/TrAzul-ICOs-Transporte.png" alt="">
                    <div class="cardTimeLine">
                        <div class="infoCard generalShadow">
                            <h3>Transportado a: ${ item.data[0].body.dispatches[0].name}</h3>
                            <p>Token: ${ item.data[0].body.dispatches[0].tokenDispatch}</p>
                            <div  class="seeMore">Ver mas.</div>
                        </div>
                        <img src="/images/poligono.svg" alt="">
                    </div>
                </div>
                <div class="line"></div>
            `
            timeLineOptions.appendChild(cardLineTransport);
        }

    });
}    

function modalDetailsAlevinos(param){

    console.log(param);
    let medicines = "";
    let ponds = "";
    let mortality = "";
    let other = "";
    let feed = "";

    if(param.feed != []){
        console.log(param.feed);
        param.feed.forEach((param) =>{
            feed += `<li><p>${param.name}</p></li>`;
        });
        console.log(feed);
    }

    if(param.medicines != []){
        param.medicines.forEach((param) =>{
            medicines += `<li><p>${param.name}</p></li>`;
        });
    }

    if(param.mortality != []){
        param.mortality.forEach((param) =>{
            mortality += `<li><p>${param.date.split('T')[0]} / ${param.quantity} peces</p></li>`;
        });
    }

    if(param.ponds != []){
        param.ponds.forEach((param) =>{
            ponds += `<li><p>${param.name}</li>`;
        });
    }


    // console.log(pa.specie);ecie);
    let div = document.createElement("div");
    div.setAttribute("id", "modalDetails");

    div.innerHTML = `
        <div class="containerModal">
            <div class="closeModal" onclick="closeModal()"><p>X</p></div>
            <div class="infoModal">
                <h1 class="titleModal">Lote de alevinos: 3</h1>

                <h3 class="subtitleModal">Información principal</h3>
                <div class="principalInformation">
                    <p><b>Especie:</b> ${param.specie}</p>
                    <p><b>Fecha de siembra:</b> ${param.sowingDate ?? ""}</p>
                    <p><b>Cantidad:</b> ${param.quantityFish ?? ""}</p>
                    <p><b>Edad:</b> ${param.age} ${param.ageUnit ?? ""}</p>
                    <p><b>Talla minima:</b> ${param.minimumSize ?? ""} </p>
                    <p><b>Talla maxima:</b> ${param.maximumSize ?? ""} </p>
                    <p><b>Precio estimado de venta:</b> ${param.estimatedSalesPrice ?? ""}</p>
                    <p><b>Descripción:</b> ${param.description ?? ""}</p>
                </div>
                <hr>
                <h3 class="subtitleModal">Insumos</h3>
                <p class="textBold"><b>Medicinas</b></p>
                <div class="insumos">
                    <ul>
                        ${medicines}
                    </ul>
                </div>
                <p class="textBold"><b>Alimentos</b></p>
                <div class="insumos">
                    <ul>
                        ${feed}
                    </ul>
                </div>
                <hr>
                <h3 class="subtitleModal">Moratilidad</h3>
                <p class="textBold"><b>Numero de peces muertos</b></p>
                <div class="insumos">
                    <ul>
                        ${mortality}
                    </ul>
                </div>
                <hr>
                <h3 class="subtitleModal">Biomasa del estanque</h3>
                <p class="textBold"><b>Peso promedio</b></p>
                <div class="insumos">
                    <ul>
                        <li><p>13/12/2024  -  4.4 kg</p></li>
                        <li><p>13/12/2024  -  9.59 kg</p></li>
                        <li><p>13/12/2024  -  9.59 kg</p></li>
                        <li><p>13/12/2024  -  9.59 kg</p></li>
                    </ul>
                </div>
                <hr>
                <h3 class="subtitleModal">Estanques</h3>
                <div class="insumos marginleftShort">
                    <ul class="marginleftShort">
                        ${ponds}
                    </ul>
                </div>
            </div>
        </div>
    `;



    document.body.appendChild(div);
}

function closeModal() {
    let modalDetails = document.getElementById('modalDetails');

    document.body.removeChild(modalDetails);
}