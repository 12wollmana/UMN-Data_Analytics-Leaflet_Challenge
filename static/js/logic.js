const usgsGeoJSONs = {
    allEarthquakesInPastSevenDays : "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    allEarthquakesInPastThirtyDays: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
    allEarthquakesInPastHour: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    allEarthquakesInPastDay: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
};

const githubGeoJSONs = {
    tectonicPlates: "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_plates.json"
}

const elements = {
    divMap : d3.select("#map")
};

const tileLayerColorSchemes = {
    satellite: "mapbox/satellite-v9",
    outdoors: "mapbox/outdoors-v11",
    light: "mapbox/light-v10",
    dark: "mapbox/dark-v10"
}

async function main(){
    const map = createMap();

    const satelliteLayer = createSatelliteLayer();
    satelliteLayer.addTo(map);
    const baseLayers = {
        "Satellite" : satelliteLayer,
        "Outdoors" : createOutdoorLayer(),
        "Light" : createTileLayer(tileLayerColorSchemes.light),
        "Dark" : createTileLayer(tileLayerColorSchemes.dark)
    };

    const geoJSON = usgsGeoJSONs.allEarthquakesInPastSevenDays;
    const { layer: earthquakeLayer, scale: earthquakeScale } = 
        await createEarthquakeLayerFromGeoJSON(geoJSON);
    earthquakeLayer.addTo(map);
    earthquakeScale.addTo(map);

    const tectonicPlateLayer = 
        await createTectonicPlateLayerFromGeoJSON
            (githubGeoJSONs.tectonicPlates);

    const overlayLayers = {
        "Earthquakes": earthquakeLayer,
        "Tectonic Plates": tectonicPlateLayer
    };

    const layerControl = L.control.layers(
        baseLayers, overlayLayers,
        {
            collapsed: false
        }
    );
    layerControl.addTo(map);
}

function createSatelliteLayer(){
    return createTileLayer(tileLayerColorSchemes.satellite);
}

function createOutdoorLayer(){
    return createTileLayer(tileLayerColorSchemes.outdoors);
}

function createTileLayer(colorScheme){
    return L.tileLayer(
        "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", 
        {
            attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
            tileSize: 512,
            maxZoom: 18,
            zoomOffset: -1,
            id: colorScheme,
            accessToken: API_KEY
        }
      );
}

async function createTectonicPlateLayerFromGeoJSON(geoJSON){
    const data = await d3.json(geoJSON);
    return L.geoJson(data);
}

async function createEarthquakeLayerFromGeoJSON(geoJSON){
    const data = await d3.json(geoJSON);
    return {
        layer : createEarthquakeLayer(data), 
        scale : createDepthScaleLegend(data)
    } ;
}

function createEarthquakeLayer(earthquakeData){

    function onEachEarthquakeFeature(feature, layer){
        const earthquakeProperties = feature.properties;
        const earthquakeGeometry = feature.geometry;

        const title = earthquakeProperties.title;
        const magnitude = earthquakeProperties.mag;
        const coordinates = earthquakeGeometry.coordinates;
        const depth = coordinates[2];

        layer.bindPopup(`
            <h3>${title}</h3>
            <hr>
            Magnitude ${magnitude.toPrecision(2)}
            <br>
            Depth: ${depth.toPrecision(3)} kilometers
        `);
    }

    function pointToEarthquakeLayer(feature, latlng){
        const earthquakeProperties = feature.properties;
        const earthquakeGeometry = feature.geometry;

        const magnitude = earthquakeProperties.mag;
        const coordinates = earthquakeGeometry.coordinates;
        const depth = coordinates[2];

        const magRadius = magnitude * 5;
        const {scaleMin, scaleMax} = 
            calculateDepthScaleMinMax(earthquakeData);
        const depthColor = calculateDepthColor(depth, scaleMax - scaleMin);

        return L.circleMarker(
            latlng, 
            {
                radius: magRadius,
                color: "black",
                weight: 1,
                fillColor: depthColor,
                fillOpacity: .75
            }
        );
    }

    const earthquakeLayer = L.geoJson(
        earthquakeData, 
        {
            pointToLayer: pointToEarthquakeLayer,
            onEachFeature: onEachEarthquakeFeature,
        }
    );

    return earthquakeLayer;
}

function calculateDepthColor(depth, range){
    if(depth < 0){
        depth = 0;
    }
    const percent = 100 - ((depth / range) * 100);
    const color = perc2color(percent);
    return color;
}

function createMap(){
    const divMap = elements.divMap;
    const coordinatesUSA = ["39.8283", "-98.5791"];
    const map = L.map(
        divMap.node(), 
        {
            center: coordinatesUSA,
            zoom: 3
        }
    );
    
    return map;
}

function createDepthScaleLegend(earthquakeData, intervals = 7){
    const {labels, colors} = 
        calculateScale(earthquakeData, intervals);
    console.log(colors);
    const legend = L.control({position: "bottomright"});
    legend.onAdd = function(){
        const div = L.DomUtil.create("div", "legend");
        const legendInfo = 
        (`
            <h2>Earthquake Depth</h2>
            <hr>
            <div class="labels">
                <div class="min">
                    ${labels[0]}
                </div>
                <div class="max">
                    ${labels[labels.length - 1]}
                </div>
            </div>
        `);
        div.innerHTML = legendInfo;
        
        let colorHTML = []
        colors.forEach(color => {
            colorHTML.push(
                `<li style="background-color: ${color}"></li>`
            );
        });

        div.innerHTML += `<ul>${colorHTML.join("")}</ul>`;
        return div;
    };
    return legend;
}

function calculateDepthScaleMinMax(earthquakeData){
    const earthquakeFeatures = earthquakeData.features;
    const depths = earthquakeFeatures.map(
        (feature)=>feature.geometry.coordinates[2]);

    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);

    const scaleMin = Math.floor(minDepth)
    const scaleMax = Math.ceil(maxDepth);

    return {scaleMin, scaleMax}
}

function calculateScale(earthquakeData, intervals){
    const {scaleMin, scaleMax} = calculateDepthScaleMinMax(earthquakeData);

    
    const scaleRange = (scaleMax - scaleMin);
    const scaleInvervals = scaleRange / (intervals - 1);

    let labels = [];
    let colors = [];
    for (let i = scaleMin; i < scaleMax+scaleInvervals; i+=scaleInvervals){
        labels.push(`${i.toFixed(1)}`);
        colors.push(calculateDepthColor(i, scaleRange));
    }

    return {
        labels: labels,
        colors: colors
    };
}

main();