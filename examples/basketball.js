import { tiny, defs } from './common.js';
import { Body, Simulation } from './collisions-demo.js';
import { Shape_From_File } from './obj-file-demo.js';
// Pull these names into this module's scope for convenience:
const { vec3, unsafe3, vec4, vec, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Basketball_Game extends Simulation
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
            this.mouseX = (event.clientX - ((1270+191)/2))/34;
            this.mouseY = (496-event.clientY)/33;
            //console.log("X: " + event.clientX + "\n" + "Y: " + event.clientY + "\n")
            console.log("X: " + this.mouseX + "\n" + "Y: " + this.mouseY + "\n")
        }
      }


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
        if ( this.mouseY >= 0 ) 
        {
          let ball_transform = Mat4.translation(1 + this.mouseX, 1 + this.mouseY, -5);
          //new Body( this.shapes.sphere4, this.materials.ball, vec3( 1,1,1 ) ).emplace( ball_transform, vec3( 0,0,0 ), vec3( 0,0,0 ) );
          this.shapes.sphere4.draw( context, program_state, ball_transform, this.materials.ball );
        }
        else    // Cannot drag the ball below the floor
        {
          let ball_transform = Mat4.translation(1 + this.mouseX, 1, -5);
          //new Body( this.shapes.sphere4, this.materials.ball, vec3( 1,1,1 ) ).emplace( ball_transform, vec3( 0,0,0 ), vec3( 0,0,0 ) );
          this.shapes.sphere4.draw( context, program_state, ball_transform, this.materials.ball );
        }
        //new Body( this.shapes.sphere4, this.materials.ball, vec3( 1,1,1 ) ).emplace( ball_transform, vec3( 0,0,0 ), vec3( 0,0,0 ) );

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