const usgsGeoJSONs = {
    allEarthquakesInPastSevenDays : "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    allEarthquakesInPastThirtyDays: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
    allEarthquakesInPastHour: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    allEarthquakesInPastDay: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
}

const elements = {
    divMap : d3.select("#map")
}

async function main(){
    const map = createMap();

    const satelliteLayer = createSatelliteLayer();
    satelliteLayer.addTo(map);
    const baseLayers = {
        "Satellite" : satelliteLayer
    };

    const geoJSON = usgsGeoJSONs.allEarthquakesInPastDay;
    const earthquakeLayer = 
        await createEarthquakeLayerFromGeoJSON(geoJSON);
    earthquakeLayer.addTo(map);
    const overlayLayers = {
        "Earthquakes": earthquakeLayer
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
    return L.tileLayer(
        "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", 
        {
            attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
            tileSize: 512,
            maxZoom: 18,
            zoomOffset: -1,
            id: "mapbox/satellite-v9",
            accessToken: API_KEY
        }
      );
}

async function createEarthquakeLayerFromGeoJSON(geoJSON){
    const data = await d3.json(geoJSON);
    return createEarthquakeLayer(data);
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
        console.log("test");
        const earthquakeProperties = feature.properties;
        const earthquakeGeometry = feature.geometry;

        const magnitude = earthquakeProperties.mag;
        const coordinates = earthquakeGeometry.coordinates;
        const depth = coordinates[2];

        const radius = magnitude * 5;

        return L.circleMarker(
            latlng, 
            {
                radius: radius,
                color: "black",
                weight: 1,
                fillColor: "purple",
                fillOpacity: .5
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

function createMap(){
    const divMap = elements.divMap;
    const coordinatesUSA = ["39.8283", "-98.5791"];
    const map = L.map(
        divMap.node(), 
        {
            center: coordinatesUSA,
            zoom: 2
        }
    );
    
    return map;
}

main();