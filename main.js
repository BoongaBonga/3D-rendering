//variables
let canvasContext, canvasElement;
let zoom = 1;
let zoomSensitivity = 0.001;

//alert("start by enabling a display.");

function createCanvas(containerElement) {
  //create canvas
  const canvas = document.createElement("canvas");

  //get dimensions
  containerRect = containerElement.getBoundingClientRect();
  containerWidth = containerRect.width;
  containerHeight = containerRect.height;
  dpr = window.devicePixelRatio;

  //set dimensions
  canvas.width = containerWidth * dpr;
  canvas.height = containerHeight * dpr;
  canvas.style.width = containerWidth;
  canvas.style.height = containerHeight;

  //append element
  containerElement.appendChild(canvas);

  //startup drawing
  let c = canvas.getContext("2d");
  c.font = "20px Arial";

  //return canvas context
  return [c, canvas];
}

//3D points
class point3D {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}
//2D points
class point2D {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

//function for translating to screencoords from a grid like this:
//  +1
//-1 0 +1
//  -1
/**
 * function for translating to screencoords from a grid like this:
 *   +1
 * -1 0 +1
 *   -1
 * to on-screen coords
 * @param {point2D} point - a 2d point
 * @param {Element} canvasEl the canvas element (for the proportions)
 * @returns {point2D} - a new point
 */
function toScreenCoords(point, canvasEl) {
  if (!canvasEl) return;
  //first things first, scale according to view zoom
  const x = point.x * zoom;
  const y = point.y * zoom;
  //first, add 1 and then multiply by half the screen size
  const x2 = (x + 1) * (canvasEl.width * 0.5);
  const y2 = (-1 * y + 1) * (canvasEl.height * 0.5);
  return new point2D(x2, y2);
}
/**
 *
 * @param {point3D} point - the 3D point
 * @returns {point2D} - a 2D point from -1 to 1
 */
function to2dPoint(point) {
  const z = point.z;
  const x2 = point.x / z;
  const y2 = point.y / z;
  return new point2D(x2, y2);
}

//function to rotate a (3D) point in xy axis (in radians angle)
function rotatexy(point, angle) {
  return new point3D(
    point.x * Math.cos(angle) - point.y * Math.sin(angle),
    point.x * Math.sin(angle) + point.y * Math.cos(angle),
    point.z
  );
}
//function to rotate a (3D) point in yz axis (in radians angle)
function rotateyz(point, angle) {
  return new point3D(
    point.x,
    point.y * Math.cos(angle) - point.z * Math.sin(angle),
    point.y * Math.sin(angle) + point.z * Math.cos(angle)
  );
}
//function to rotate a (3D) point in xz axis (in radians angle)
function rotatexz(point, angle) {
  return new point3D(
    point.x * Math.cos(angle) + point.z * Math.sin(angle),
    point.y,
    point.x * -1 * Math.sin(angle) + point.z * Math.cos(angle)
  );
}

//draw some text
function drawText(point, text, offset_X = 5, offset_Y = 20) {
  const pointScreen = toScreenCoords(to2dPoint(point), canvasElement);
  canvasContext.fillText(text, pointScreen.x + offset_X, pointScreen.y + offset_Y);
}

//draw a line on a 2D canvas
/**
 * draws a line from two 3D points
 * @param {Context} canvasCtx - the canvas
 * @param {point3D} p1 - a 3D point from your view
 * @param {point3D} p2 - a 3D point from your view
 * @param {number} thick - line thickness
 */
function drawLine(canvasCtx, canvasEl, p1, p2, thick) {
  //translated to 2D point
  const p1_2D = to2dPoint(p1);
  const p2_2D = to2dPoint(p2);

  //translated to screen coords
  const p1Screen = toScreenCoords(p1_2D, canvasEl);
  const p2Screen = toScreenCoords(p2_2D, canvasEl);

  canvasCtx.lineWidth = thick;
  canvasCtx.beginPath();
  canvasCtx.moveTo(p1Screen.x, p1Screen.y);
  canvasCtx.lineTo(p2Screen.x, p2Screen.y);
  canvasCtx.stroke();
}
function quickline(x, y, z, x2, y2, z2, thick) {
  drawLine(
    canvasContext,
    canvasElement,
    transform(new point3D(x, y, z)),
    transform(new point3D(x2, y2, z2)),
    thick
  );
}

//draw a "dot"
/**
 *
 * @param {Context} canvasCtx - the canvas
 * @param {point3D} point - a 3D point that is not yet projected
 * @param {number} size - size of the point
 */
function drawDot(canvasCtx, canvasEl, point, size) {
  //translated to 2D point
  const p1_2D = to2dPoint(point);

  //translated to screen coords
  const p1Screen = toScreenCoords(p1_2D, canvasEl);

  const halfsize = size * 0.5;
  canvasCtx.fillRect(p1Screen.x - halfsize, p1Screen.y - halfsize, size, size);
}

//function to see wether a triangle is facing the front
function isFacingFront(p1, p2, p3) {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
}

//fill in a triangle
/**
 * draws a triangle from 3D points, and projects them on the screen
 * @param {*} canvasCtx - canvas context
 * @param {*} canvasEl - canvas element
 * @param {*} p1 - first point
 * @param {*} p2 - second point
 * @param {*} p3 - third point
 * @param {*} color - triangle color
 * @returns - whether the operation was succesfull
 */
function drawTriangle(canvasCtx, canvasEl, p1, p2, p3, color) {
  //translated to 2D point
  const p1_2D = to2dPoint(p1);
  const p2_2D = to2dPoint(p2);
  const p3_2D = to2dPoint(p3);

  //translated to screen coords
  const p1Screen = toScreenCoords(p1_2D, canvasEl);
  const p2Screen = toScreenCoords(p2_2D, canvasEl);
  const p3Screen = toScreenCoords(p3_2D, canvasEl);

  if (!isFacingFront(p1Screen, p2Screen, p3Screen)) return false;

  canvasCtx.fillStyle = color;
  canvasCtx.beginPath();
  canvasCtx.moveTo(p1Screen.x, p1Screen.y);
  canvasCtx.lineTo(p2Screen.x, p2Screen.y);
  canvasCtx.lineTo(p3Screen.x, p3Screen.y);
  canvasCtx.lineTo(p1Screen.x, p1Screen.y);
  canvasCtx.fill();
  return true;
}

function randomColor() {
  return `rgb(${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, ${Math.round(
    Math.random() * 255
  )})`;
}

//variables used in the transforming
let zOffset = 2.5; //distance from camera
let phi = 0; // up and down bobbing
let alpha = 0; // rotating
//a function that determines how the points will be rotated or translated in the final view
function transform(point) {
  //rotation
  const pRotated = rotatexz(point, alpha);
  //translation
  const pTranslated = new point3D(pRotated.x, pRotated.y + Math.sin(phi), pRotated.z + zOffset);
  //optional other behavior???

  //return
  return pTranslated;
}

let dots = [
  //cube
  new point3D(0.5, 0.5, 0.5), //0
  new point3D(0.5, -0.5, 0.5), //1
  new point3D(-0.5, -0.5, 0.5), //2
  new point3D(-0.5, 0.5, 0.5), //3
  new point3D(0.5, 0.5, -0.5), //4
  new point3D(0.5, -0.5, -0.5), //5
  new point3D(-0.5, -0.5, -0.5), //6
  new point3D(-0.5, 0.5, -0.5), //7
  //center
  new point3D(0, 0, 0), //8
];

//allow the user to add points by themselves
function addPoint() {
  dots.push(
    new point3D(Number(add_point_X.value), Number(add_point_Y.value), Number(add_point_Z.value))
  );
}
function removePoint() {
  let index = Number(remove_point_index.value);
  //remove lines with point that has been deleted
  removeLinesWithPoint(index);
  removeFacesWithPoint(index);
  //shift the indices of the other lines and faces
  decrementLinesFromIndex(index);
  decrementFacesFromIndex(index);
  dots.splice(index, 1);
}

//array of arrays of indices in the dots array to connect
let lines = [
  //front square
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  //back square
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  //connections
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  /*
  //right cross
  [0, 5],
  [1, 4],
  //left cross
  [2, 7],
  [3, 6],
  */
];

//allow the user to add lines by passing in two point's indices
function addLine() {
  lines.push([Number(add_line_1.value), Number(add_line_2.value)]);
}
function removeLine() {
  lines.splice(Number(remove_line_index.value), 1);
}

function removeLinesWithPoint(point) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (point == lines[i][0] || point == lines[i][1]) {
      lines.splice(i, 1);
    }
  }
}
function decrementLinesFromIndex(removedIndex) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i][0] > removedIndex) {
      lines[i][0]--;
    }
    if (lines[i][1] > removedIndex) {
      lines[i][1]--;
    }
  }
}

//array of triangles formed with arrays of size 3 with indices of the points in the point array
let triangles = [
  //front two triangles (facing front)
  [6, 7, 4, "yellow"],
  [6, 4, 5, "yellow"],
  //back two triangles
  [2, 1, 0, "red"],
  [3, 2, 0, "red"],
  //side right triangles
  [5, 4, 0, "green"],
  [0, 1, 5, "green"],
  //side left triangles
  [3, 7, 2, "blue"],
  [2, 7, 6, "blue"],

  //top
  [7, 3, 0, "white"],
  [7, 0, 4, "white"],

  //bottom
  [5, 1, 2, "orange"],
  [5, 2, 6, "orange"],
];

//allow the user to add faces
function addFace() {
  triangles.push([
    Number(add_face_1.value),
    Number(add_face_2.value),
    Number(add_face_3.value),
    add_face_color.value,
  ]);
}
function removeFace() {
  triangles.splice(Number(remove_face_index.value), 1);
  console.log(triangles);
}

function removeFacesWithPoint(point) {
  for (let i = triangles.length - 1; i >= 0; i--) {
    if (point == triangles[i][0] || point == triangles[i][1] || point == triangles[i][2]) {
      triangles.splice(i, 1);
    }
  }
}
function decrementFacesFromIndex(removedIndex) {
  for (let i = 0; i < triangles.length; i++) {
    if (triangles[i][0] > removedIndex) {
      triangles[i][0]--;
    }
    if (triangles[i][1] > removedIndex) {
      triangles[i][1]--;
    }
    if (triangles[i][2] > removedIndex) {
      triangles[i][2]--;
    }
  }
}

//
//
//

//main draw loop!!!
let loop = window.setInterval(() => {
  canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

  //draw some guidelines
  if (grid_enable.checked) {
    canvasContext.fillStyle = "black";
    quickline(0, 0, -1, 0, 0, 1, 2);
    quickline(1, 0, 0, -1, 0, 0, 2);
    quickline(0, 1, 0, 0, -1, 0, 2);
    drawText(transform(new point3D(1, 0, 0)), "+X");
    drawText(transform(new point3D(-1, 0, 0)), "-X");
    drawText(transform(new point3D(0, 1, 0)), "+Y");
    drawText(transform(new point3D(0, -1, 0)), "-Y");
    drawText(transform(new point3D(0, 0, 1)), "+Z");
    drawText(transform(new point3D(0, 0, -1)), "-Z");
  }

  //draw the dots!
  if (display_points.checked) {
    canvasContext.fillStyle = "red";
    for (i in dots) {
      //original points
      const p1 = dots[i];
      const p1Transformed = transform(p1);

      drawDot(canvasContext, canvasElement, p1Transformed, 10);

      //add numbering
      if (!display_points_text.checked) continue;
      drawText(p1Transformed, i);
    }
  }

  //draw the lines
  if (display_lines.checked) {
    canvasContext.fillStyle = "blue";
    for (i in lines) {
      const l = lines[i];
      //original points
      const p1 = dots[l[0]];
      const p2 = dots[l[1]];

      p1Transformed = transform(p1);
      p2Transformed = transform(p2);

      drawLine(canvasContext, canvasElement, p1Transformed, p2Transformed, 1);

      if (!display_lines_text.checked) continue;
      const middlePoint = new point3D(
        (p2Transformed.x - p1Transformed.x) / 2 + p1Transformed.x,
        (p2Transformed.y - p1Transformed.y) / 2 + p1Transformed.y,
        (p2Transformed.z - p1Transformed.z) / 2 + p1Transformed.z
      );
      drawText(middlePoint, i);
    }
  }

  //draw the triangles
  if (display_faces.checked) {
    for (i in triangles) {
      const triangle = triangles[i];
      const p1 = dots[triangle[0]];
      const p2 = dots[triangle[1]];
      const p3 = dots[triangle[2]];

      const p1Transformed = transform(p1);
      const p2Transformed = transform(p2);
      const p3Transformed = transform(p3);

      if (
        !drawTriangle(
          canvasContext,
          canvasElement,
          p1Transformed,
          p2Transformed,
          p3Transformed,
          triangle[3]
        )
      ) {
        continue;
      }

      if (!display_faces_text.checked) continue;
      canvasContext.fillStyle = "black";
      const middlePoint = new point3D(
        (p1Transformed.x + p2Transformed.x + p3Transformed.x) / 3,
        (p1Transformed.y + p2Transformed.y + p3Transformed.y) / 3,
        (p1Transformed.z + p2Transformed.z + p3Transformed.z) / 3
      );
      drawText(middlePoint, i);
    }
  }

  if (move_enable.checked) {
    //zOffset += 0.01;
    alpha += 0.02;
    phi += 0.05;
  }
}, 20);

//
//
//
//
//
//help text
add_face_help.addEventListener("mouseover", () => {
  face_help_text.style.display = "block";
});
add_face_help.addEventListener("mouseout", () => {
  face_help_text.style.display = "none";
});
add_line_help.addEventListener("mouseover", () => {
  line_help_text.style.display = "block";
});
add_line_help.addEventListener("mouseout", () => {
  line_help_text.style.display = "none";
});

//zooming
document.addEventListener("wheel", (e) => {
  zoom *= Math.exp(-e.deltaY * zoomSensitivity); //make it a lil smaller
});

//saving
function save() {
  let save = {
    dots: dots,
    lines: lines,
    triangles: triangles,
  };
  localStorage.setItem("save_vrnjzpbvjrfzobjvfi", JSON.stringify(save));
}
document.addEventListener("beforeunload", save);
//loading
//on startup
function load() {
  [canvasContext, canvasElement] = createCanvas(document.getElementById("canvasContainer"));

  let save = JSON.parse(localStorage.getItem("save_vrnjzpbvjrfzobjvfi"));
  if (!save) return;
  dots = save.dots;
  lines = save.lines;
  triangles = save.triangles;
}

function reset() {
  localStorage.removeItem("save_vrnjzpbvjrfzobjvfi");
  location.reload();
}
