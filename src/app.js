
import FCS from '../node_modules/fcs/fcs.js';
import Plotly from '../node_modules/plotly.js-dist';
import { pinv,multiply,transpose,abs,sign,log10,add,dotMultiply,matrix,median,subtract,exp,sqrt } from '../node_modules/mathjs';
import seedrandom from '../node_modules/seedrandom';
import inside from '../node_modules/point-in-polygon';

let shape_list = [];
let points = [];
let clicks = 0;
let dragging = false;
let dragStart = null;
let dragShapeIndex = null;
let originalPoints = [];
let dclick = false;
let path;
let movedPoints = [];
let mode = "draw"; 
let selectedShape;
let shape_count = 0;
let shape_bins = [];
let raw_color = "rgba(100, 100, 100, 0.9)";
let new_color = "rgba(0, 81, 255, 0.5)";
let layer = document.getElementById('original-plot');
let scale_mathod = "linear"; //"log10"
let subset_plot_on = false;
let anchor_shift_list = [];


let raw_fcsArray;
let R_array;
let R_t_array;
let B_raw_array;
let B_shifted_array;
let B_shifted_t_array;
let B_shifted_t_pinv;
let A_shifted_array;





let logArray = [];

let directoryHandle;
let UnmixfileHandle;
let csvArray;
let ChannelNames;
let A_Array;
let A_pinv;

let PrimaryValueList;
let SecondaryValueList;
let PSValueList;
let selectedPSValue;
let selectedRowIndex;

let SCCfileHandle;
let fcsArray = [];
let fcsColumnNames = [];
let fcsArrayPlotset = [];
let SubsetMethod;
let SubsetSize;
let PlotCellSize;
let PlotCellSize_default = 20000;
let x_val = '';
let y_val = '';

let selectedSubset_fcsArray;
let positivefcsArray;
let negativefcsArray;

let LefSig;
let medianPosValue;
let RawSig;
let CorrectFactor_default;
let CorrectFactor;

let A_Array_corrected;
let A_pinv_corrected;
let fcsArrayPlotset_corrected;
let x_val_corrected = '';
let y_val_corrected = '';
let selectedSubset_fcsArray_corrected;

let csvArray_Output;
let enable_density_plot = false;





// Select fcs Data folder
document.getElementById('select-folder').addEventListener('click', async () => {
    try {
        // Show the directory picker
        directoryHandle = await window.showDirectoryPicker();
        
        // Get the name of the selected folder
        const folderName = directoryHandle.name;
        
        // Display the folder name
        document.getElementById('folder-name').textContent = `Selected Folder: ${folderName}`;
        
    } catch (error) {
        console.error('Error selecting folder:', error);
        customLog('Error selecting folder:', error);
    }
});

// Select unmixing matrix csv file
document.getElementById('file-input').addEventListener('change', (event) => {
    const fileInput = event.target;
    if (fileInput.files.length > 0) {
        UnmixfileHandle = fileInput.files[0];
        const fileName = UnmixfileHandle.name;
        document.getElementById('file-name').textContent = `Selected File: ${fileName}`;
        customLog('Selected File: ' + fileName);
        document.getElementById('read-csv').disabled = false;
        
    }
});

// Read unmixing matrix csv file
document.getElementById('read-csv').addEventListener('click', async () => {
    try {
        if (!UnmixfileHandle) {
            alert('Please select a file first.');
            return;
        }

        // Read the file
        const text = await UnmixfileHandle.text();
        
        // Parse CSV content using PapaParse
        Papa.parse(text, {
            header: true,
            complete: function(results) {
                csvArray = results.data;
                console.log('CSV Array:', csvArray);
                customLog('CSV Array:', csvArray);
                ChannelNames = results.meta.fields;
                ChannelNames = ChannelNames.slice(2);
                console.log('ChannelNames:', ChannelNames);
                customLog('ChannelNames:', ChannelNames);
                // check if last row is empty
                if (csvArray.length > 0 && Object.values(csvArray[csvArray.length - 1]).every(value => value === "")) {
                    csvArray.pop(); // remove last row
                }
                let twoDimArray = csvArray.map(obj => Object.values(obj));
                A_Array = twoDimArray.map(row => row.slice(2).map(Number));//remove first two columns (primary and secondary labels)
                A_Array = transpose(A_Array);
                console.log('A_Array:', A_Array);
                customLog('A_Array:', A_Array);

                PSValueList = csvArray.map(row => {
                    const primaryValue = row[Object.keys(row)[0]];
                    const secondaryValue = row[Object.keys(row)[1]];
                    return `${primaryValue} - ${secondaryValue}`;
                });

                PrimaryValueList = csvArray.map(row => {
                    const primaryValue = row[Object.keys(row)[0]];
                    return `${primaryValue}`;
                });

                SecondaryValueList = csvArray.map(row => {
                    const secondaryValue = row[Object.keys(row)[1]];
                    return `${secondaryValue}`;
                });
                console.log('PSValueList:', PSValueList);
                console.log('PrimaryValueList:', PrimaryValueList);
                console.log('SecondaryValueList:', SecondaryValueList);
                customLog('PSValueList:', PSValueList);
                customLog('PrimaryValueList:', PrimaryValueList);
                customLog('SecondaryValueList:', SecondaryValueList);
            }
        });

        //show csvArray
        displayCSVTable(csvArray,'csv-table');

        //show File Dropdown
        populateFileDropdown(directoryHandle);
        document.getElementById('file-dropdown-select-alert').style.display = 'block';
        document.getElementById('file-dropdown').style.display = 'block';

        
        //calculate pinv matrix
        A_pinv = pinv(A_Array);
        console.log('A_pinv:', A_pinv);
        customLog('A_pinv:', A_pinv);
        let MultiplyMatrix_I_pinv = multiply(A_pinv, A_Array);
        console.log('MultiplyMatrix_I_pinv:', MultiplyMatrix_I_pinv);
        customLog('MultiplyMatrix_I_pinv:', MultiplyMatrix_I_pinv);
    } catch (error) {
        console.error('Error reading CSV file:', error);
        customLog('Error reading CSV file:', error);
    }
});

// Display unmixing matrix csv file
function displayCSVTable(data,ElementId) {
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');

    // Create table headers
    Object.keys(data[0]).forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Create table rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    // Append table to the div
    document.getElementById(ElementId).innerHTML = '';
    document.getElementById(ElementId).appendChild(table);
}


// Show Dropdown to select scc fcs file for positive signature
async function populateFileDropdown(directoryHandle) {
    const fileDropdown = document.getElementById('file-dropdown');
    fileDropdown.innerHTML = '';

    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
            const option = document.createElement('option');
            option.textContent = entry.name;
            option.value = entry.name;
            fileDropdown.appendChild(option);
        }
    }

    fileDropdown.addEventListener('change', async (event) => {
        const selectedFileName = event.target.value;
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name === selectedFileName) {
                SCCfileHandle = entry;
                document.getElementById('file-dropdown-name').textContent = `Selected File: ${SCCfileHandle.name}`;
                customLog('Selected File: ' + SCCfileHandle.name);
                document.getElementById('run-button').style.display = 'block';
                document.getElementById('subset-method-selection').style.display = 'block';
                break;
            }
        }
    });
}

// Read selected scc fcs file

async function readFCSFile() {
    //show file-reading-reminder
    document.getElementById('file-reading-reminder-div').style.display = 'block';
    if (SCCfileHandle) {
        const file = await SCCfileHandle.getFile();
        const reader = new FileReader();
        reader.onload = function(e) {
            SubsetMethod = document.querySelector('input[name="subset-method"]:checked').value;
            
            
            //import fcs file
            document.getElementById('file-reading-reminder-progress').innerText = '>---- import fcs file';
            let arrayBuffer = e.target.result;
            //console.log("arrayBuffer: ", arrayBuffer); 
            customLog("arrayBuffer: ", "finished. ");
            
            let buffer = Buffer.from(arrayBuffer);
            arrayBuffer = null //remove arrayBuffer
            //console.log("buffer: ", buffer); 
            customLog("buffer: ", "finished. ");
            
            document.getElementById('file-reading-reminder-progress').innerText = '>>--- extract dataset';
            let fcs = new FCS({ dataFormat: 'asNumber', eventsToRead: -1}, buffer);
            buffer = null //remove buffer
            //console.log("fcs: ", fcs); 
            customLog("fcs: ", "finished. ");
            
            // fcsColumnNames
            const text = fcs.text;
            const columnNames = [];
            //columnNames are stored in `$P${i}S` in Xenith
            for (let i = 1; text[`$P${i}S`]; i++) {
                columnNames.push(text[`$P${i}S`]);
            }
            //columnNames are stored in `$P${i}N` in Aurora
            if (columnNames.length == 0) {
                for (let i = 1; text[`$P${i}N`]; i++) {
                    columnNames.push(text[`$P${i}N`]);
                }
            }
            fcsColumnNames = columnNames;
            
            // fcsArray
            fcsArray = fcs.dataAsNumbers; 
            fcs = null; //remove fcs
            //console.log("fcsArray: ",fcsArray); 
            console.log('Column Names:', fcsColumnNames);
            customLog("fcsArray: ", "finished. ");
            customLog('Column Names:', fcsColumnNames);

            //check fcs size and do subset
            document.getElementById('file-reading-reminder-progress').innerText = '>>>-- subset dataset';
            SubsetSize = parseInt(document.getElementById('subset-size').value, 10);
            let full_fcsArraylength = fcsArray.length
            customLog("full_fcsArraylength: ",full_fcsArraylength);
            if (full_fcsArraylength > SubsetSize){
                if (SubsetMethod == "random") {
                    fcsArray = generateSubset(fcsArray,SubsetSize)
                }
                document.getElementById('file-reading-worrying-div').style.display = 'block';
                document.getElementById('file-reading-worrying1').innerText = 'Note: the fcs file has too many cells (' + full_fcsArraylength + '), only ' + SubsetSize + ' cells are imported';
                document.getElementById('file-reading-worrying2').innerText = 'Subset method: ' + SubsetMethod;
                document.getElementById('file-reading-worrying3').innerText = 'Subset size: ' + SubsetSize;
                customLog('Note: the fcs file has too many cells (' + full_fcsArraylength + '), only ' + SubsetSize + ' cells are imported');
                customLog('Subset method: ' + SubsetMethod);
                customLog('Subset size: ' + SubsetSize);
            } else {
                document.getElementById('file-reading-worrying-div').style.display = 'block';
                document.getElementById('file-reading-worrying3').innerText = 'Note: all cells (' + full_fcsArraylength + ') are imported';
                customLog('Note: all cells (' + full_fcsArraylength + ') are imported');
            }
            
            //filter fcsArray
            document.getElementById('file-reading-reminder-progress').innerText = '>>>>- filter dataset';
            var filteredfcsArrayforUnmix = filterFCSArrayByChannelNames(fcsArray, fcsColumnNames, ChannelNames);
            filteredfcsArrayforUnmix = transpose(filteredfcsArrayforUnmix);
            console.log('Filtered FCS Array:', filteredfcsArrayforUnmix);
            customLog('Row number of Filtered FCS Array:', filteredfcsArrayforUnmix.length);
            customLog('Column number of Filtered FCS Array:', filteredfcsArrayforUnmix[0].length);
            
            //Do unmixing
            document.getElementById('file-reading-reminder-progress').innerText = '>>>>> unmixing';
            let unmixedMatrix = multiply(A_pinv, filteredfcsArrayforUnmix);
            unmixedMatrix = transpose(unmixedMatrix);
            console.log('unmixedMatrix:', unmixedMatrix);
            customLog('Row number of unmixedMatrix:', unmixedMatrix.length);
            customLog('Column number of unmixedMatrix:', unmixedMatrix[0].length);
            // add unmixedMatrix back to fcsArray 
            fcsArray = mergeArraysHorizontally(fcsArray, unmixedMatrix);
            console.log('Merged fcsArray:', fcsArray);
            customLog('Row number of Merged fcsArray:', fcsArray.length);
            customLog('Column number of Merged fcsArray:', fcsArray[0].length);
            fcsColumnNames = fcsColumnNames.concat(PSValueList)
            console.log('Merged fcsColumnNames:', fcsColumnNames);
            customLog('Merged fcsColumnNames:', fcsColumnNames);

            // change file-reading-reminder
            document.getElementById('file-reading-reminder-progress').style.display = 'none';
            document.getElementById('file-reading-reminder').innerText = 'Done reading the scc file!';
            //show set-anchor-button
            document.getElementById('set-anchor-button').style.display = 'block';
        };
        reader.readAsArrayBuffer(file);
    } else {
        console.error('No file selected');
        customLog('No file selected');
    }
}


function filterFCSArrayByChannelNames(fcsArray, fcsColumnNames, ChannelNames) {
    // Create an array to store the indices of the columns to keep
    const indicesToKeep = ChannelNames.map(channel => fcsColumnNames.indexOf(channel)).filter(index => index !== -1);

    // Filter the fcsArray to keep only the columns with the specified indices
    const filteredFCSArray = fcsArray.map(row => indicesToKeep.map(index => row[index]));

    return filteredFCSArray;
}

function mergeArraysHorizontally(array1, array2) {
    if (array1.length !== array2.length) {
        throw new Error('The arrays must have the same number of rows to merge them horizontally.');
    }

    return array1.map((row, index) => row.concat(array2[index]));
}

document.getElementById('run-button').addEventListener('click', readFCSFile);

// Select x and y axes
document.getElementById('set-anchor-button').addEventListener('click', () => {
    //Generate axis pulldown for raw and corrected plots
    populateColumnDropdowns('x-dropdown',fcsColumnNames);
    populateColumnDropdowns('y-dropdown',fcsColumnNames);
    populateColumnDropdowns('corrected-x-dropdown',fcsColumnNames);
    populateColumnDropdowns('corrected-y-dropdown',fcsColumnNames);

    document.getElementById('plotset-size-input-reminder').style.display = 'block';
    document.getElementById('plotset-size-input-reminder').innerText = "The input fcs file has " + fcsArray.length + " cells. Please the cell size for plot."
    document.getElementById('plotset-size-input').style.display = 'block';
    document.getElementById('plotset-size-input').value = PlotCellSize_default;

    document.getElementById('x-dropdown').style.display = 'block';
    document.getElementById('x-dropdown-select-reminder').style.display = 'block';
    document.getElementById('y-dropdown').style.display = 'block';
    document.getElementById('y-dropdown-select-reminder').style.display = 'block';

    document.getElementById('plot-button').style.display = 'block';
})

function populateColumnDropdowns(dropdownelement_id,options) {
    const Dropdown = document.getElementById(dropdownelement_id);
    Dropdown.innerHTML = '';

    options.forEach(name => {
        const Option = document.createElement('option');
        Option.textContent = name;
        Option.value = name;
        Dropdown.appendChild(Option);
    });
}

document.getElementById('x-dropdown').addEventListener('change', function(event) {
    x_val = event.target.value;
    console.log('Selected x_val:', x_val);
    customLog('Selected x_val:', x_val);
});

document.getElementById('y-dropdown').addEventListener('change', function(event) {
    y_val = event.target.value;
    console.log('Selected y_val:', y_val);
    customLog('Selected y_val:', y_val);
});

// Create scatter plot

function getRandomSubset(array, size, seed) {
    const random = seedrandom(seed);
    const shuffled = array.slice(0);
    let i = array.length;
    let min = i - size;
    let temp, index;

    while (i-- > min) {
        index = Math.floor((i + 1) * random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }

    return shuffled.slice(min);
}

function generateSubset(fcsArrayInput,PlotCellSize){
    var Plotset
    if (fcsArrayInput.length > PlotCellSize) {
        Plotset = getRandomSubset(fcsArrayInput, PlotCellSize, 123);
    } else if (fcsArray.length == 0){
        console.error('fcsArrayInput is empty');
        customLog('fcsArrayInput is empty');
    } else {
        Plotset = fcsArrayInput
    }
    console.log('Subset Data:', Plotset); 
    customLog('Row number of Subset Data:', Plotset.length);
    customLog('Column number of Subset Data:', Plotset[0].length);
    return Plotset
}



function createPlotset_back(fcsArrayPlotset,x_val,y_val,fcsColumnNames,enable_density_plot) {
    let x_title;
    let y_title;
    const xIndex = fcsColumnNames.indexOf(x_val);
    const yIndex = fcsColumnNames.indexOf(y_val);
    if (xIndex === -1 || yIndex === -1) {
        console.error('Invalid column names');
        customLog('Invalid column names');
        return;
    }
    var xData = fcsArrayPlotset.map(row => row[xIndex]);
    var yData = fcsArrayPlotset.map(row => row[yIndex]);
    //scale
    if (scale_mathod == "log10") {
        x_title = x_val;
        y_title = y_val;
    } else if (scale_mathod == "log10") {
        xData = dotMultiply(sign(xData),log10(add(abs(xData),1)));
        yData = dotMultiply(sign(yData),log10(add(abs(yData),1)));
        x_title = x_val + " (log10)";
        y_title = y_val + " (log10)";
    }
    
    if (enable_density_plot) {
        const data = [];
        for (let i = 0; i < xData.length; i++) {
            data.push([xData[i], yData[i]]);
        }
        const kde = new KernelDensityEstimator(data);
        const density = kde.estimateDensity();
    
        var trace = {
            x: xData,
            y: yData,
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 6,
                color: density,
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: 'Density'
                }
            }
        };
    } else {
        var trace = {
                x: xData,
                y: yData,
                mode: 'markers',
                type: 'scatter'
            }
    }

    let layout = {
        title: {text: 'Scatter Plot (Raw)'},
        xaxis: { title: {text: x_title}},
        yaxis: { title: {text: y_title}},
        dragmode: 'select' // Enable selection mode
    };
    
    const customIcon = {
        width: 500,
        height: 500,
        path: `M64 64 H448 V448 H64 Z`,
        ascent: 500,
        descent: 0
    };

    var config = {
        modeBarButtonsToAdd: [{
            name: 'Disable selection',
            icon: customIcon, 
            click: function(gd) {
                Plotly.relayout(gd, { dragmode: false });
            }
        }],
        displayModeBar: true
    };

    Plotly.newPlot('original-plot', [trace], layout, config);

    document.getElementById('original-plot').style.display = 'block';
    document.getElementById('plot-reminder').style.display = 'block';
    document.getElementById('plot-reminder').innerText = "Total cell counts: " + xData.length
    document.getElementById('selected-reminder').style.display = 'block';
    // Add event listener for selection
    const plotElement = document.getElementById('original-plot');
    plotElement.on('plotly_selected', function(eventData) {
        try{
            const selectedPoints_count = eventData.points.length
            const selectedPoints = eventData.points;
            const selectedIndices = selectedPoints.map(point => point.pointIndex);
            selectedSubset_fcsArray = selectedIndices.map(index => fcsArrayPlotset[index]);
            console.log('Selected Subset:', selectedSubset_fcsArray);
            customLog('Row number of Selected Subset:', selectedSubset_fcsArray.length);
            customLog('Column number of Selected Subset:', selectedSubset_fcsArray[0].length);
            document.getElementById('selected-reminder').innerText = "Selected cell count: " + selectedPoints_count
        } catch (error) {
            document.getElementById('selected-reminder').innerText = "Selected cell count: 0";
        }
    });
}

class KernelDensityEstimator {
    constructor(data) {
        this.data = data;
    }

    estimateDensity() {
        const density = [];
        for (let i = 0; i < this.data.length; i++) {
            let sum = 0;
            for (let j = 0; j < this.data.length; j++) {
                sum += this.kernel(this.distance(this.data[i], this.data[j]));
            }
            density.push(sum / this.data.length);
        }
        return density;
    }

    kernel(distance) {
        return exp(-0.5 * distance * distance) / sqrt(2 * Math.PI);
    }

    distance(point1, point2) {
        return sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
    }
}

document.getElementById('plot-button').addEventListener('click', async () => {
    PlotCellSize = document.getElementById('plotset-size-input').value
    fcsArrayPlotset = generateSubset(fcsArray,PlotCellSize)
    x_val = document.getElementById('x-dropdown').value
    y_val = document.getElementById('y-dropdown').value
    createPlotset(fcsArrayPlotset,x_val,y_val,fcsColumnNames,enable_density_plot);
    subset_plot_on = false;
    document.getElementById('replot-button').style.display = 'block';
    document.getElementById('calculation-button').style.display = 'block';
}); 

// Re-plot with selected population
document.getElementById('replot-button').addEventListener('click', async () => {
    x_val = document.getElementById('x-dropdown').value
    y_val = document.getElementById('y-dropdown').value
    createPlotset(selectedSubset_fcsArray,x_val,y_val,fcsColumnNames,enable_density_plot);
    subset_plot_on = true;
}); 

function createPlotset(fcsArrayPlotset,x_val,y_val,fcsColumnNames,enable_density_plot) {
    let x_title;
    let y_title;
    const xIndex = fcsColumnNames.indexOf(x_val);
    const yIndex = fcsColumnNames.indexOf(y_val);
    if (xIndex === -1 || yIndex === -1) {
        console.error('Invalid column names');
        customLog('Invalid column names');
        return;
    }
    var xData = fcsArrayPlotset.map(row => row[xIndex]);
    var yData = fcsArrayPlotset.map(row => row[yIndex]);
    //scale
    if (scale_mathod == "log10") {
        x_title = x_val;
        y_title = y_val;
    } else if (scale_mathod == "log10") {
        xData = dotMultiply(sign(xData),log10(add(abs(xData),1)));
        yData = dotMultiply(sign(yData),log10(add(abs(yData),1)));
        x_title = x_val + " (log10)";
        y_title = y_val + " (log10)";
    }
    
    if (enable_density_plot) {
        const data = [];
        for (let i = 0; i < xData.length; i++) {
            data.push([xData[i], yData[i]]);
        }
        const kde = new KernelDensityEstimator(data);
        const density = kde.estimateDensity();
    
        var trace = {
            x: xData,
            y: yData,
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 6,
                color: density,
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: 'Density'
                }
            }
        };
    } else {
        var trace = {
                x: xData,
                y: yData,
                mode: 'markers',
                type: 'scatter'
            }
    }

    let layout = {
        title: {text: 'Scatter Plot (Raw)'},
        xaxis: { title: {text: x_title},fixedrange: false},
        yaxis: { title: {text: y_title},fixedrange: false},
        dragmode: false,
        hoverdistance: 500,
        margin: {
            t: 0,
            b: 20,
            r: 0,
            l: 20
        }
    };
    
    const customIcon = {
        width: 500,
        height: 500,
        path: `M64 64 H448 V448 H64 Z`,
        ascent: 500,
        descent: 0
    };

    var config = {
        modeBarButtonsToAdd: [{
            name: 'Disable selection',
            icon: customIcon, 
            click: function(gd) {
                Plotly.relayout(gd, { dragmode: false });
            }
        }],
        doubleClick: true,
        responsive: true,
        displayModeBar: true
    };

    Plotly.newPlot('original-plot', [trace], layout, config);
    layer
        .on("plotly_click", data => {
            if (mode !== "draw") return;

            if(dclick) {
                dclick = false
                clicks = 0
                points = []
                return
            }
            
            clicks += 1

            var index = (layer._fullLayout.shapes || []).length
            var x = layer._fullLayout.xaxis.p2c(data.event.layerX - layer._fullLayout.margin.l)
            var y = layer._fullLayout.yaxis.p2c(data.event.layerY - layer._fullLayout.margin.t)
            
            points.push({ x, y })
            
            path = generatePath(points)

            if(points.length > 1) {
                Plotly.update(layer, {}, { [`shapes[${index - 1}].path`]: path })
            } else {
                Plotly.update(layer, {}, {
                    [`shapes[${index}]`]: {
                        type: "path",
                        path: path,
                        line: {
                            color: raw_color
                        }
                    }
                })
            }
            document.getElementById('ploygon-info-div').innerText = JSON.stringify(points);
        })

    document.getElementById('original-plot').style.display = 'block';
    document.getElementById('plot-reminder').style.display = 'block';
    document.getElementById('plot-reminder').innerText = "Total cell counts: " + xData.length
    document.getElementById('drager-bottons-div').style.display = 'block';
    document.getElementById('selected-reminder').style.display = 'block';
    // Add event listener for selection
    const plotElement = document.getElementById('original-plot');
    plotElement.on('plotly_selected', function(eventData) {
        try{
            const selectedPoints_count = eventData.points.length
            const selectedPoints = eventData.points;
            const selectedIndices = selectedPoints.map(point => point.pointIndex);
            selectedSubset_fcsArray = selectedIndices.map(index => fcsArrayPlotset[index]);
            console.log('Selected Subset:', selectedSubset_fcsArray);
            customLog('Row number of Selected Subset:', selectedSubset_fcsArray.length);
            customLog('Column number of Selected Subset:', selectedSubset_fcsArray[0].length);
            document.getElementById('selected-reminder').innerText = "Selected cell count: " + selectedPoints_count
        } catch (error) {
            document.getElementById('selected-reminder').innerText = "Selected cell count: 0";
        }
    });
}

document.addEventListener("mousedown", e => {
    if (e.button === 1) { // roll
        e.preventDefault();

        if (mode == "draw") {
            dclick = true
        
            var index = (layer._fullLayout.shapes || []).length

            if(index) {
                path = `${layer._fullLayout.shapes[index - 1].path}Z`
                //raw shape
                Plotly.update(layer, {}, {
                    [`shapes[${index - 1}].path`]: path,
                    
                })
                //new shape
                Plotly.update(layer, {}, {
                    [`shapes[${index}]`]: {
                        type: "path",
                        path: path,
                        line: {
                            color: new_color
                        }
                    }
                })
            }

            //update shape_list
            update_shape_list(points)
            points = [];
        }


    } else {
        if (mode !== "drag") return;
        const selectedIndex = selectedShape-1;

        if (!isNaN(selectedIndex)) {
            dragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            dragShapeIndex = selectedIndex;
            originalPoints = shape_list[selectedIndex];
            
        }
    }

    
});

document.addEventListener("mousemove", e => {
    
    if (mode === "draw" && points.length) {

        var index = layer._fullLayout.shapes.length - 1;
        var x = layer._fullLayout.xaxis.p2c(e.layerX - layer._fullLayout.margin.l);
        var y = layer._fullLayout.yaxis.p2c(e.layerY - layer._fullLayout.margin.t);

        points[clicks] = { x, y };
        var path = generatePath(points);
        Plotly.relayout(layer, { [`shapes[${index}].path`]: path });
    }
    
    if (mode === "drag" && dragging && dragShapeIndex !== null) {

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        const xShift = dx / layer._fullLayout.xaxis._m;
        const yShift = dy / layer._fullLayout.yaxis._m;

        movedPoints = originalPoints.map(p => ({
            x: p.x + xShift,
            y: p.y + yShift
        }));
        
        const newPath = generatePath(movedPoints) + "Z";
        Plotly.relayout(layer, { [`shapes[${dragShapeIndex}].path`]: newPath });

    }
});

document.addEventListener("mouseup", () => {

    if (mode !== "drag") return;
    // update shape_list
    if(movedPoints.length > 0) {
        shape_list[dragShapeIndex] = movedPoints;
    }
    
    dragging = false;
    dragStart = null;
    dragShapeIndex = null;
    originalPoints = [];
    movedPoints = [];

});

function generatePath(pts) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function update_shape_list(points) {

    //raw shape
    shape_list.push(points);
    //new shape
    shape_list.push(points);
    console.log("shape_list: ", shape_list); 

    // add shape select radio
    const selector_div = document.getElementById('shape-selector-div');
    const sub_div = document.createElement('div');
    const anchor_num = (shape_count / 2)+1;

    // add raw radio
    const label_raw = document.createElement('label');
    label_raw.innerText = `Raw anchor ${anchor_num}`;
    label_raw.style.marginRight = '10px';
    label_raw.style.color = raw_color;
    const input_raw = document.createElement('input');
    input_raw.type = 'radio';
    input_raw.name = 'shape';
    input_raw.value = shape_count + 1;
    input_raw.addEventListener('change',event => {
        selectedShape = event.target.value;
        console.log(`selectedShape: ${selectedShape}`);
    })
    label_raw.appendChild(input_raw);
    sub_div.appendChild(label_raw);
    shape_count += 1;

    // add new radio
    const label_new = document.createElement('label');
    label_new.innerText = `New anchor ${anchor_num}`;
    label_new.style.marginRight = '10px';
    label_new.style.color = new_color;
    const input_new = document.createElement('input');
    input_new.type = 'radio';
    input_new.name = 'shape';
    input_new.value = shape_count + 1;
    input_new.addEventListener('change',event => {
        selectedShape = event.target.value;
        console.log(`selectedShape: ${selectedShape}`);
    })
    input_new.checked = true;
    selectedShape = input_new.value;
    console.log(`selectedShape: ${selectedShape}`);
    label_new.appendChild(input_new);
    sub_div.appendChild(label_new);
    shape_count += 1;

    // add bins
    const defaul_bin = 3;
    const label_input = document.createElement('label');
    label_input.innerText = `Bins: `;
    const input_bin = document.createElement('input');
    input_bin.type = 'number';
    input_bin.name = anchor_num;
    input_bin.min = 1;
    input_bin.max = 10;
    input_bin.step = 1;
    input_bin.required = true;
    input_bin.value = defaul_bin;
    input_bin.addEventListener('change',event => {
        shape_bins[event.target.name-1] = event.target.valueAsNumber
        console.log("shape_bins: ",shape_bins)
    })
    label_input.appendChild(input_bin);
    sub_div.appendChild(label_input);
    shape_bins.push(defaul_bin)

    selector_div.appendChild(sub_div);
}

document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', event => {
        mode = event.target.value;
        points = [];
        clicks = 0;
        console.log("Mode: ", mode === "draw" ? "Draw" : "Drag");
    });
});




function AnchorShiftCalculater(shape_list) {

    let shift_list = [];
    const anchar_num = shape_list.length / 2;
    
    for (let i = 0; i < anchar_num; i++) {
        let s1 = shape_list[(i * 2)][0];
        let s2 = shape_list[(i * 2) + 1][0];

        let shift = {
            x: s2.x - s1.x,
            y: s2.y - s1.y
        };

        shift_list.push(shift)

    }
    return shift_list

}


function pointInPolygon(point, xIndex, yIndex, polygon,fcsColumnNames) {
    const pt = [point[xIndex], point[yIndex]];
    return inside(pt, polygon);
}

function getRandomSample(array, n) {
    const result = [];

    for (let i = 0; i < n; i++) {
        const randIndex = Math.floor(Math.random() * array.length);
        result.push(array[randIndex]);
    }

    return result;
}


function calculateMean(arrayOfRows) {
    if (arrayOfRows.length === 0) return [];

    const numCols = arrayOfRows[0].length;
    const sums = new Array(numCols).fill(0);

    for (let row of arrayOfRows) {
        for (let i = 0; i < numCols; i++) {
            sums[i] += row[i];
        }
    }

    return sums.map(sum => sum / arrayOfRows.length);
}


function MeanPointsCalculater(fcsArray, shape_list, shape_bins, x_val, y_val, fcsColumnNames) {
    let output_array = [];

    for (let i = 0; i < shape_bins.length; i++) {
        const shape = shape_list[i * 2].map(p => [p.x, p.y]); //raw shape
        const bin_count = shape_bins[i];

        // 1.find points in shape
        //console.log('fcsArray: ',fcsArray);
        //console.log('fcsColumnNames: ',fcsColumnNames);
        const xIndex = fcsColumnNames.indexOf(x_val);
        const yIndex = fcsColumnNames.indexOf(y_val);
        const points_in_shape = fcsArray.filter(p => pointInPolygon(p, xIndex, yIndex, shape, fcsColumnNames));
        //console.log('points_in_shape: ',points_in_shape);
        // 2. check points_in_shape.length
        if (points_in_shape.length < bin_count) {
            document.getElementById('calculation-button-reminder1').style.display = 'block';
            document.getElementById('calculation-button-reminder1').innerText = `Shape ${i} has only ${points_in_shape.length} points, less than required ${bin_count}. Please adjust to include more points.`;
        }

        // 3. sample and mean
        const sample_n = Math.floor(points_in_shape.length / bin_count);
        //console.log('sample_n: ',sample_n);
        for (let j = 0; j < bin_count; j++) {
            const sample = getRandomSample(points_in_shape, sample_n);
            //console.log('sample: ',sample);
            const mean = calculateMean(sample);
            //console.log('mean: ',mean);
            output_array.push(mean);
            //console.log('output_array: ',output_array);
        }
    }

    return output_array;
}

function subset_array(fcsArray, allColumnNames, ColumnNames) {
    const indices = ColumnNames.map(name => allColumnNames.indexOf(name)).filter(i => i !== -1);
    return fcsArray.map(row => indices.map(i => row[i]));
}


function Shift_B_calculater(B_raw_array, PSValueList, x_val, y_val, shape_bins, anchor_shift_list) {
    let raw_array = B_raw_array.map(row => [...row]);

    let n_row = 0;
    const xIndex = PSValueList.indexOf(x_val);
    const yIndex = PSValueList.indexOf(y_val);

    if (xIndex === -1 || yIndex === -1) {
        console.warn(`Invalid column name: ${x_val} or ${y_val}`);
        return raw_array;
    }

    for (let i_shape = 0; i_shape < shape_bins.length; i_shape++) {
        const shift = anchor_shift_list[i_shape];
        const binCount = shape_bins[i_shape];
        console.log('shift: ',shift);
        console.log('binCount: ',binCount);
        for (let i_bin = 0; i_bin < binCount; i_bin++) {
            if (n_row >= raw_array.length) {
                console.warn(`n_row ${n_row} exceeds B_raw_array length`);
                break;
            }
            console.log('B_raw_array[n_row] before: ',raw_array[n_row]);
            raw_array[n_row][xIndex] += shift.x;
            raw_array[n_row][yIndex] += shift.y;
            console.log('B_raw_array[n_row] after: ',raw_array[n_row]);
            n_row += 1;
        }
    }

    return raw_array;
}



// Calculate 
document.getElementById('calculation-button').addEventListener('click', async () => {
    //check positivefcsArray and negativefcsArray 
    if (shape_list.length === 0 ) {
        document.getElementById('calculation-button-reminder').style.display = 'block';
        document.getElementById('calculation-button-reminder').innerText = "Please set anchars first.";
    }else{
        // Proceed with calculation
        try {
            // calculate anchor_shift_list
            console.log('Calculating anchars...');
            customLog('Calculating anchars...');
            
            anchor_shift_list = AnchorShiftCalculater(shape_list);

            // calculate raw mean(random sample) points
            if (!subset_plot_on) {
                raw_fcsArray = MeanPointsCalculater(fcsArrayPlotset,shape_list,shape_bins, x_val, y_val,fcsColumnNames);
            } else {
                raw_fcsArray = MeanPointsCalculater(selectedSubset_fcsArray,shape_list,shape_bins, x_val, y_val,fcsColumnNames);
            }

            if (raw_fcsArray.length < PSValueList.length) {
                document.getElementById('calculation-button-reminder2').style.display = 'block';
                document.getElementById('calculation-button-reminder2').innerText = `The sum of bins are less then the number of fluors. Please try higher bins values`;
            }

            // split into R and B_raw
            R_array = subset_array(raw_fcsArray, fcsColumnNames, ChannelNames)
            B_raw_array = subset_array(raw_fcsArray, fcsColumnNames, PSValueList)

            // create B_shifted from B_raw
            B_shifted_array = Shift_B_calculater(B_raw_array,PSValueList,x_val,y_val,shape_bins,anchor_shift_list)
            
            // recover A_shifted
            B_shifted_t_array = transpose(B_shifted_array);
            B_shifted_t_pinv = pinv(B_shifted_t_array);
            console.log('B_shifted_t_array:', B_shifted_t_array);
            console.log('B_shifted_t_pinv:', B_shifted_t_pinv);
            let MultiplyMatrix_I_pinv = multiply(B_shifted_t_array, B_shifted_t_pinv);
            console.log('MultiplyMatrix_I_pinv:', MultiplyMatrix_I_pinv);
            
            R_t_array = transpose(R_array)
            console.log('R_t_array:', R_t_array);
            A_shifted_array = multiply(R_t_array, B_shifted_t_pinv);
            console.log('A_shifted:', A_shifted_array);


            // Assign x_val and y_val to x_val_corrected and y_val_corrected
            document.getElementById('corrected-x-dropdown').value = x_val;
            document.getElementById('corrected-y-dropdown').value = y_val;
            x_val_corrected = x_val;
            y_val_corrected = y_val;
            
            document.getElementById('submit-factor-button').style.display = 'block';
            

        } catch (error) {
            console.error('Error during calculation:', error);
            customLog('Error during calculation:', error);
            document.getElementById('calculation-button-reminder').style.display = 'block';
            document.getElementById('calculation-button-reminder').innerText = "An error occurred during calculation. Please try again.";
        }
    }
}); 

document.getElementById('submit-factor-button').addEventListener('click', () => {

    console.log('A_Array: ', A_Array);
    console.log('A_shifted_array: ', A_shifted_array);

    A_Array_corrected = A_shifted_array;
    console.log('A_Array_corrected: ', A_Array_corrected);
    customLog('A_Array_corrected: ', A_Array_corrected);
    A_pinv_corrected = pinv(A_Array_corrected);

    let A_Array_corrected_for_display = transpose(A_Array_corrected);
    let csvArray_optimized = csvArray.map(obj => Object.values(obj));
    const csvArraycolumnNames = Object.keys(csvArray[0]);
    customLog('csvArraycolumnNames: ', csvArraycolumnNames);
    
    csvArray_optimized.unshift(csvArraycolumnNames);
    displayCSVTable(csvArray_optimized,'csv-table-optimized');
    // UnmixCorrected
    fcsArrayPlotset_corrected = UnmixCorrected(fcsArrayPlotset,fcsColumnNames,ChannelNames,A_pinv_corrected,PSValueList)
    // Show x_val_corrected and y_val_corrected
    document.getElementById('corrected-x-dropdown').style.display = 'block';
    document.getElementById('corrected-x-dropdown-select-reminder').style.display = 'block';
    document.getElementById('corrected-y-dropdown').style.display = 'block';
    document.getElementById('corrected-y-dropdown-select-reminder').style.display = 'block';
    document.getElementById('corrected-plot-button').style.display = 'block';
   
});

document.getElementById('corrected-x-dropdown').addEventListener('change', function(event) {
    x_val_corrected = event.target.value;
    console.log('Selected x_val_corrected:', x_val_corrected);
    customLog('Selected x_val_corrected:', x_val_corrected);
});

document.getElementById('corrected-y-dropdown').addEventListener('change', function(event) {
    y_val_corrected = event.target.value;
    console.log('Selected y_val_corrected:', y_val_corrected);
    customLog('Selected y_val_corrected:', y_val_corrected);
});

// Do unmix with A_pinv_corrected 
function UnmixCorrected(fcsArraySubset,fcsColumnNames,ChannelNames,A_pinv_corrected,PSValueList){
    //filter fcsArray
    var filteredfcsArrayforUnmix = filterFCSArrayByChannelNames(fcsArraySubset, fcsColumnNames, ChannelNames);
    filteredfcsArrayforUnmix = transpose(filteredfcsArrayforUnmix);
    console.log('Filtered FCS Array for UnmixCorrected:', filteredfcsArrayforUnmix);
    customLog('Row number of Filtered FCS Array for UnmixCorrected:', filteredfcsArrayforUnmix.length);
    customLog('Column number of Filtered FCS Array for UnmixCorrected:', filteredfcsArrayforUnmix[0].length);
    //Do unmixing
    let unmixedMatrix = multiply(A_pinv_corrected, filteredfcsArrayforUnmix);
    unmixedMatrix = transpose(unmixedMatrix);
    console.log('unmixedMatrix for UnmixCorrected:', unmixedMatrix);
    customLog('Row number of unmixedMatrix for UnmixCorrected:', unmixedMatrix.length);
    customLog('Column number of unmixedMatrix for UnmixCorrected:', unmixedMatrix[0].length);
    //remove previous unmixed results from fcsArraySubset
    const numSigs = PSValueList.length;
    fcsArraySubset = fcsArraySubset.map(row => row.slice(0, -numSigs));
    console.log('fcsArraySubset without previous unmixed results:', unmixedMatrix);
    customLog('Row number of fcsArraySubset without previous unmixed results:', unmixedMatrix.length);
    customLog('Column number of fcsArraySubset without previous unmixed results:', unmixedMatrix[0].length);
    // add unmixedMatrix back to fcsArraySubset 
    fcsArraySubset = mergeArraysHorizontally(fcsArraySubset, unmixedMatrix);
    console.log('Merged fcsArraySubset for UnmixCorrected:', fcsArraySubset);
    customLog('Row number of Merged fcsArraySubset for UnmixCorrected:', fcsArraySubset.length);
    customLog('Column number of Merged fcsArraySubset for UnmixCorrected:', fcsArraySubset[0].length);

    return fcsArraySubset
}

document.getElementById('corrected-plot-button').addEventListener('click', () => {
    // plot new scatter plot
    x_val_corrected = document.getElementById('corrected-x-dropdown').value
    y_val_corrected = document.getElementById('corrected-y-dropdown').value
    createCorrectedPlotset(fcsArrayPlotset_corrected,x_val_corrected,y_val_corrected,fcsColumnNames,enable_density_plot);
    document.getElementById('corrected-replot-button').style.display = 'block';

    // show save button
    csvArray_Output = replaceArrayColumns(csvArray, A_Array_corrected);
    console.log('csvArray_Output: ',csvArray_Output);
    customLog('csvArray_Output: ',csvArray_Output);
    document.getElementById('csv-table-optimized').style.display = 'block';
    document.getElementById('save-button').style.display = 'block';
    document.getElementById('export-log-button').style.display = 'block';
});

// Plot corrected scatter plot
function createCorrectedPlotset(fcsArrayPlotset,x_val,y_val,fcsColumnNames,enable_density_plot) {
    let x_title;
    let y_title;
    const xIndex = fcsColumnNames.indexOf(x_val);
    const yIndex = fcsColumnNames.indexOf(y_val);
    if (xIndex === -1 || yIndex === -1) {
        console.error('Invalid column names');
        customLog('Invalid column names');
        return;
    }
    var xData = fcsArrayPlotset.map(row => row[xIndex]);
    var yData = fcsArrayPlotset.map(row => row[yIndex]);
    //scale data
    if (scale_mathod == "log10") {
        x_title = x_val;
        y_title = y_val;
    } else if (scale_mathod == "log10") {
        xData = dotMultiply(sign(xData),log10(add(abs(xData),1)));
        yData = dotMultiply(sign(yData),log10(add(abs(yData),1)));
        x_title = x_val + " (log10)";
        y_title = y_val + " (log10)";
    }
    

    if (enable_density_plot) {
        const data = [];
        for (let i = 0; i < xData.length; i++) {
            data.push([xData[i], yData[i]]);
        }
        const kde = new KernelDensityEstimator(data);
        const density = kde.estimateDensity();

        var trace = {
            x: xData,
            y: yData,
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 6,
                color: density,
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: 'Density'
                }
            }
        };
    
    } else {
        var trace = {
            x: xData,
            y: yData,
            mode: 'markers',
            type: 'scatter'
        };
    }
    

    

    const layout = {
        title: { text: 'Scatter Plot (Shifted)'},
        xaxis: { title: {text: x_title},fixedrange: false},
        yaxis: { title: {text: y_title},fixedrange: false},
        dragmode: false,
        hoverdistance: 500,
        margin: {
            t: 0,
            b: 20,
            r: 0,
            l: 20
        }
    };
    document.getElementById('corrected-plot-reminder').style.display = 'block';
    document.getElementById('corrected-plot-reminder').innerText = "Total cell counts: " + xData.length
    Plotly.newPlot('corrected-plot', [trace], layout);

    document.getElementById('corrected-selected-reminder').style.display = 'block';
    // Add event listener for selection
    const plotElement = document.getElementById('corrected-plot');
    plotElement.on('plotly_selected', function(eventData) {
        try{
            const selectedPoints_count = eventData.points.length
            const selectedPoints = eventData.points;
            const selectedIndices = selectedPoints.map(point => point.pointIndex);
            selectedSubset_fcsArray_corrected = selectedIndices.map(index => fcsArrayPlotset[index]);
            console.log('Selected Subset:', selectedSubset_fcsArray_corrected);
            customLog('Row number of Selected Subset:', selectedSubset_fcsArray_corrected.length);
            customLog('Column number of Selected Subset:', selectedSubset_fcsArray_corrected[0].length);
            document.getElementById('corrected-selected-reminder').innerText = "Selected cell count: " + selectedPoints_count
        } catch (error) {
            document.getElementById('corrected-selected-reminder').innerText = "Selected cell count: 0";
        }
    });
}

// Re-plot corrected scatter plot with selected population
document.getElementById('corrected-replot-button').addEventListener('click', async () => {
    x_val_corrected = document.getElementById('corrected-x-dropdown').value
    y_val_corrected = document.getElementById('corrected-y-dropdown').value
    createCorrectedPlotset(selectedSubset_fcsArray_corrected,x_val_corrected,y_val_corrected,fcsColumnNames,enable_density_plot);
}); 

// Prepare Output csvArray
function replaceArrayColumns(csvArray, A_Array_corrected) {
    // copy newArray from csvArray
    let twoDimArray = csvArray.map(obj => Object.values(obj));

    const newArray = twoDimArray.map(row => [...row]);

    // transpose A_Array_corrected
    const A_Array_corrected_transposed = transpose(A_Array_corrected);

    // relace value in newArray with A_Array_corrected
    newArray.forEach((row, rowIndex) => {
        for (let colIndex = 2; colIndex < row.length; colIndex++) {
            row[colIndex] = A_Array_corrected_transposed[rowIndex][colIndex - 2];
        }
    });

    return newArray;
}

document.getElementById('save-button').addEventListener('click', () => {
    
    // Convert array to CSV format
    const csvHeader = ['Primary', 'Secondary', ...ChannelNames].join(',');
    const csvContent = csvArray_Output.map(row => row.join(',')).join('\n');
    const csvData = `${csvHeader}\n${csvContent}`;

    // Create a blob from the CSV content
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

    // Create a link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'corrected_unmixing_mtx.csv';

    // Append the link to the body
    document.body.appendChild(link);

    // Programmatically click the link to trigger the download
    link.click();

    // Remove the link from the body
    document.body.removeChild(link);
});

document.getElementById('copy-button').addEventListener('click', () => {
    const table = document.getElementById('csv-table-optimized');
    const range = document.createRange();
    range.selectNode(table);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
        console.log('Copy table command was ' + msg);
        document.getElementById('copy-button-reminder').innerText = 'Copy table command was ' + msg;
    } catch (err) {
        console.error('Oops, unable to copy. ', err);
        document.getElementById('copy-button-reminder').innerText = 'Oops, unable to copy. ' + err;
    }

    selection.removeAllRanges();
});


function customLog(...args) {
    const timestamp = new Date().toISOString(); 
    const logEntry = `[${timestamp}] ${args.join(' ')}`;
    logArray.push(logEntry);
    console.log.apply(console, [logEntry]); 
}

document.getElementById('export-log-button').addEventListener('click', () => {
    const logContent = logArray.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'console_log.txt';
    a.click();
    URL.revokeObjectURL(url);
});

//npm run build




