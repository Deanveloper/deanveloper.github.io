import {init, currentTool} from "./draw"

export const $ = require("jquery");

let canvasStack = [];
let redoStack = [];
let $base;

export function pushNewCanvas() {

    removeListener($(peekCanvas()));

    // create a new canvas
    const $canvas = $("<canvas width='" + $base.attr("width") + "' height='" + $base.attr("height") + "'>");
    $canvas.css({position: "absolute"});

    // add it to our canvas stack
    canvasStack.push($canvas[0]);
    $("body").append($canvas);

    addListener($canvas);
}

export function peekCanvas() {
    return canvasStack[canvasStack.length - 1];
}

export function undo() {
    // pop from canvas stack -> "erase" it -> add to redo stack
    const $canvas = $(canvasStack.pop());
    $canvas.css({display: "none"});
    redoStack.push($canvas[0]);
}

export function redo() {
    // pop from redo stack -> display it -> add to canvas stack
    const $canvas = $(redoStack.pop());
    $canvas.css({display: ""});
    canvasStack.push($canvas[0]);
}

export function image(asCanvas) {
    const flat = $("<canvas width='" + $base.attr("width") + "' height='" + $base.attr("height") + "'>")[0];
    const ctx = flat.getContext('2d');

    for (const can of canvasStack) {
        ctx.drawImage(can, 0, 0);
    }

    if (asCanvas) {
        return flat;
    }

    const image = new Image();
    image.src = flat.toDataURL("image/png");
    return image;
}

export function newBase($canvas) {
    $base = $canvas;

    while(canvasStack.length > 0) {
        $(canvasStack.pop()).remove();
    }

    canvasStack.push($base[0]);
}

/**
 * add listeners
 */
$(document).ready(() => {
    const upload = $("#image-upload");

    $(window).on("paste", (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file.type.startsWith("image")) {
                    showImage(window.URL.createObjectURL(file));
                } else {
                    console.log("Invalid MIME type: " + file.type);
                }
            } else {
                console.log("Not a file/image: " + item);
            }
        }
    });

    upload.click(() => {
        $("#file-input").click()
    });

    upload.on("dragenter", (e) => {
        upload.css({backgroundColor: "#C5ECAB"});
        e.stopPropagation();
        e.preventDefault();
    });

    upload.on('dragover', (e) => {
        e.stopPropagation();
        e.preventDefault();
    });

    upload.on("dragexit", (e) => {
        upload.css({backgroundColor: "#ECE7AB"});
        e.stopPropagation();
        e.preventDefault();
    });

    upload.on("drop", (e) => {
        e.stopPropagation();
        e.preventDefault();

        let files = e.originalEvent.dataTransfer.files;
        if (!files) {
            console.log("No files!");
            upload.trigger("dragexit");
        } else {
            const file = files[0];
            if (file && file.type.startsWith("image")) {
                showImage(window.URL.createObjectURL(file));
            } else {
                console.log("Invalid MIME type: " + file.type);
                upload.trigger("dragexit");
            }
        }
    });

    $("#file-input").change((e) => {
        showImage(window.URL.createObjectURL(e.target.files[0]));
    });
});

/**
 * Displays an image.
 *
 * @param link The link to the image, usually made with URL.createObjectUrl()
 */
function showImage(link) {
    const body = $("body");
    body.empty();
    const background = $("<div class='no-select'>");
    background.css({
        backgroundColor: "rgba(0, 0, 0, 75%)",
        width: "100%",
        height: "100%",
        position: "fixed",
        margin: 0
    });
    body.append(background);
    const img = new Image();
    $(img).on("load", () => {

        $base = $("<canvas id='main' width='" + img.width + "' height='" + img.height + "'>");
        $base.css({position: "absolute"});
        $base[0].getContext('2d').drawImage(img, 0, 0);

        canvasStack.push($base[0]);

        body.append(background);
        body.append($base);

        init();
    });
    img.src = link;
}

function addListener($canvas) {
    let clicking = false;

    $canvas.mousedown((e) => {
        if(!clicking) {
            clicking = true;
            currentTool().mousedown(e, $canvas[0]);
        }
    });

    $canvas.mousemove((e) => {
        if(clicking) {
            currentTool().mousedrag(e, $canvas[0]);
        }
    });

    $canvas.mouseup((e) => {
        if(clicking) {
            clicking = false;
            currentTool().mouseup(e, $canvas[0]);
        }
        // clear the undo/redo stack
        while(redoStack.length > 0) {
            $(redoStack.pop()).remove();
        }
        // push new canvas
        pushNewCanvas();
    });
}

function removeListener($canvas) {
    $canvas.off("mousedown mousemove mouseup");
}