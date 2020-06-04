import {tiny, defs} from './common.js';
// Pull these names into this module's scope for convenience:
const { vec3, vec4, vec, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Shape_From_File extends Shape {
    // **Shape_From_File** is a versatile standalone Shape that imports
    // all its arrays' data from an .obj 3D model file.
    constructor(filename) {
        super("position", "normal", "texture_coord");
        // Begin downloading the mesh. Once that completes, return
        // control to our parse_into_mesh function.
        this.load_file(filename);
    }

    load_file(filename) {                             // Request the external file and wait for it to load.
        // Failure mode:  Loads an empty shape.
        return fetch(filename)
            .then(response => {
                if (response.ok) return Promise.resolve(response.text())
                else return Promise.reject(response.status)
            })
            .then(obj_file_contents => this.parse_into_mesh(obj_file_contents))
            .catch(error => {
                this.copy_onto_graphics_card(this.gl);
            })
    }

    parse_into_mesh(data) {                           // Adapted from the "webgl-obj-loader.js" library found online:
        var verts = [], vertNormals = [], textures = [], unpacked = {};

        unpacked.verts = [];
        unpacked.norms = [];
        unpacked.textures = [];
        unpacked.hashindices = {};
        unpacked.indices = [];
        unpacked.index = 0;

        var lines = data.split('\n');

        var VERTEX_RE = /^v\s/;
        var NORMAL_RE = /^vn\s/;
        var TEXTURE_RE = /^vt\s/;
        var FACE_RE = /^f\s/;
        var WHITESPACE_RE = /\s+/;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            var elements = line.split(WHITESPACE_RE);
            elements.shift();

            if (VERTEX_RE.test(line)) verts.push.apply(verts, elements);
            else if (NORMAL_RE.test(line)) vertNormals.push.apply(vertNormals, elements);
            else if (TEXTURE_RE.test(line)) textures.push.apply(textures, elements);
            else if (FACE_RE.test(line)) {
                var quad = false;
                for (var j = 0, eleLen = elements.length; j < eleLen; j++) {
                    if (j === 3 && !quad) {
                        j = 2;
                        quad = true;
                    }
                    if (elements[j] in unpacked.hashindices)
                        unpacked.indices.push(unpacked.hashindices[elements[j]]);
                    else {
                        var vertex = elements[j].split('/');

                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);

                        if (textures.length) {
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 0]);
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 1]);
                        }

                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 0]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 1]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 2]);

                        unpacked.hashindices[elements[j]] = unpacked.index;
                        unpacked.indices.push(unpacked.index);
                        unpacked.index += 1;
                    }
                    if (j === 3 && quad) unpacked.indices.push(unpacked.hashindices[elements[0]]);
                }
            }
        }
        {
            const {verts, norms, textures} = unpacked;
            for (var j = 0; j < verts.length / 3; j++) {
                this.arrays.position.push(vec3(verts[3 * j], verts[3 * j + 1], verts[3 * j + 2]));
                this.arrays.normal.push(vec3(norms[3 * j], norms[3 * j + 1], norms[3 * j + 2]));
                this.arrays.texture_coord.push(vec(textures[2 * j], textures[2 * j + 1]));
            }
            this.indices = unpacked.indices;
        }
        this.normalize_positions(false);
        this.ready = true;
    }

    draw(context, program_state, model_transform, material) {               // draw(): Same as always for shapes, but cancel all
        // attempts to draw the shape before it loads:
        if (this.ready)
            super.draw(context, program_state, model_transform, material);
    }
}


export class Basketball_Game extends Scene
  { constructor( context )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { 
        super();    // First, include a secondary Scene that provides movement controls:
        this.mouse_enabled_canvases = new Set();

        this.shapes = {  square:    new defs.Square(),
                         sphere4:   new defs.Subdivision_Sphere( 4 ),
                         cube:      new defs.Cube(),
                         hoop:      new Shape_From_File("assets/basketball_hoop.obj")
                         //text:      new defs.Text_Line(10)
                       };
                                     
        // Make some Material objects available to you:
        const t_phong = new defs.Textured_Phong();
        const phong = new defs.Phong_Shader();
        const bump  = new defs.Fake_Bump_Map();
        this.materials =
          { ball:     new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture( "assets/ball.png") }),

            board:    new Material( phong, { color: color( 0.15, 0.15, 0.15, 1 ),
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0  }),

            text_img: new Material( t_phong, { color: color( 1, 1, 1, 1 ), 
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/text.png") }),

            ground:   new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/court.png") }),

            wall:     new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/walls.png") }),

            hoop:     new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/basketball_hoop_re.jpg") })
          };

        /* ================================= ATTRIBUTES FOR BASKETBALL_SCENE ========================================= */
   
//         var rect = mainCanvas.getBoundingClientRect();
//         console.log(rect);
//         mainCanvas.addEventListener("mousemove", this.track.bind(this));
//         mainCanvas.addEventListener("mousedown", this.click.bind(this));
//         mainCanvas.addEventListener("mouseup", this.unclick.bind(this));
//         this.mouseX = 0;
//         this.mouseY = 0;
//         this.mouseDown = false;

        //this.ball_transform = Mat4.translation( 0+this.mouseX,1+this.mouseY,-5 );

        /* =========================================================================================================== */
      }

    add_mouse_controls( canvas )
    {                                       // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
                                            // First, measure mouse steering, for rotating the flyaround camera:
      this.mouse = { "from_center": vec( 0,0 ) };
      const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) => 
                                   vec( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
      //console.log(canvas.getBoundingClientRect());
                                // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
      canvas  .addEventListener( "mousemove",  this.track.bind(this) );
      canvas  .addEventListener( "mousedown",  this.click.bind(this) );
      canvas  .addEventListener( "mouseup",    this.unclick.bind(this) );
    }

    click(event) 
      {
        this.mouseDown = true;
      }

    unclick(event) 
      {
        this.mouseDown = false;
      }

    track(event) 
      {
        if (this.mouseDown) 
        {
            this.mouseX = event.clientX - 548;//(canvas.right - canvas.left)/2;
            this.mouseY = -1 * (event.clientY - 308);//(canvas.bottom - canvas.top)/2);
            //this.mouseX = (event.clientX - ((1087+5)/2))/30;
            //this.mouseY = (459-event.clientY)/29;
            console.log("X: " + this.mouseX + "\n" + "Y: " + this.mouseY + "\n")
        }
      }
//     mouse_tracker( event )        // Mouse tracker for our canvas
//       {
//         var rect = document.getElementById("main-canvas").getBoundingClientRect();
//         this.mouseX = event.clientX - (rect.left + rect.right)/2;
//         this.mouseY = -1 * (event.clientY - (rect.bottom + rect.top - 379)/2);
//         //console.log(this.mouseX, this.mouseY);
//       }

//     cast_ray()       
//       {
//         if (this.mouseX >= -540 && this.mouseX <= 540 && this.mouseY >= -300 && this.mouseY <= 300)     // Only perform ray cast if we clicked on the scene
//           {  
//             //console.log(this.mouseX, this.mouseY); 
//             var norm_x = this.mouseX / 540.;    // Convert to normalized device coordinates x,y: [-1,1]
//             var norm_y = this.mouseY / 300.;

//             var ray_clip = Vec.of(norm_x, norm_y, -1.0, 1.0);   
//             var ray_eye = Mat4.inverse( this.projection_transform ).times(ray_clip);    // Convert to eye space
//             ray_eye = ray_eye.plus( Vec.of(0,0,0,-10.) );
//             //console.log(ray_eye);
//             var ray_world = this.initial_camera_location.times(ray_eye);        // Convert to world space
//             ray_world = ray_world.to3().normalized();
//             console.log(ray_world);

//             // Check for intersection between ray and the basketball
//             //var ray2center = 
//           }
//       }

    make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { this.key_triggered_button( "View scene",  [ "0" ], () => this.attached = () => this.initial_camera_location );
        this.new_line();
        //super.make_control_panel();

      }

    display( context, program_state )
      { //super.display( context, program_state )
        program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, .1, 1000 );
        program_state.lights = [ new Light( vec4( 5,-10,5,1 ), color( 0, 1, 1, 1 ), 1000 ) ];
        program_state.set_camera( Mat4.look_at( vec3( 0,9,17 ), vec3( 0,5,-20 ), vec3( 0,1,0 ) ));

        if( !context.scratchpad.controls ) 
        { 
          this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );
          this.children.push( new defs.Program_State_Viewer() );
        }

        if( !this.mouse_enabled_canvases.has( context.canvas ) )
        { 
          this.add_mouse_controls( context.canvas );
          this.mouse_enabled_canvases.add( context.canvas )
        }

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // Draw the basketball
        let ball_transform = Mat4.translation(0,1,-5);//Mat4.translation( 0 + this.mouseX, 1 + this.mouseY, -5 );
        this.shapes.sphere4.draw( context, program_state, ball_transform, this.materials.ball );

        // Draw the basketball hoop
        let hoop_transform = Mat4.translation(0,15.35,-23.5)
                .times(Mat4.scale( 1.3,1.15,1.3 ));
        this.shapes.hoop.draw( context, program_state, hoop_transform, this.materials.hoop );

        // Draw the scoreboard
        let scoreboard_transform = Mat4.translation( -17,20,-35 )
                .times(Mat4.scale( 7,4,.25 ));
        this.shapes.cube.draw( context, program_state, scoreboard_transform, this.materials.board);

        // Draw the ground 
        let ground_transform = Mat4.rotation( Math.PI/2, 0,1,0 )
                .times(Mat4.rotation( Math.PI/2, 1,0,0 ))
                .times(Mat4.scale( 35,25,1 ));
        this.shapes.square.draw( context, program_state, ground_transform, this.materials.ground);

        // Draw the walls 
        let wall_transform = Mat4.rotation( Math.PI/2, 0,1,0 )
                .times(Mat4.translation( 0,15,25 ))
                .times(Mat4.scale( 35,15,0 ));
        this.shapes.square.draw( context, program_state, wall_transform, this.materials.wall);  // Left wall
        wall_transform = Mat4.identity()
                .times(Mat4.rotation( Math.PI/2, 0,1,0 ))
                .times(Mat4.translation( 0,15,-25 ))
                .times(Mat4.scale( 35,15,0 ));
        this.shapes.square.draw( context, program_state, wall_transform, this.materials.wall);  // Right wall
        wall_transform = Mat4.identity()
                .times(Mat4.rotation( -Math.PI/2, 0,1,0 ))
                .times(Mat4.rotation( Math.PI/2, 0,1,0 ))
                .times(Mat4.translation( 0,15,-35 ))
                .times(Mat4.scale( 25,15,0 ));
        this.shapes.square.draw( context, program_state, wall_transform, this.materials.wall);  // Front wall


      }
  }