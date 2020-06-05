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

        this.launch = false;
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.last_mouseX = 0;
        this.last_mouseY = 0;
        this.mouse_pos = Array(100).fill(0);
      }

    add_mouse_controls( canvas )
    {                                       // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
                                            // First, measure mouse steering, for rotating the flyaround camera:
      this.mouse = { "from_center": vec( 0,0 ) };
      this.mouse_position = ( e, rect = canvas.getBoundingClientRect() ) => 
                                   vec( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );

      // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
      canvas  .addEventListener( "mousemove",  this.track.bind(this) );
      canvas  .addEventListener( "mousedown",  this.click.bind(this) );
      canvas  .addEventListener( "mouseup",    this.unclick.bind(this) );

    }

    click(event) 
      {
        this.mouseDown = true;
        this.launch = false;
      }

    unclick(event) 
      {
        this.mouseDown = false;
        this.launch = true;
      }

    track(event) 
      {
        if (this.mouseDown) 
        {
            this.mouseX = (this.mouse_position(event)[0])/34;
            this.mouseY = (183-this.mouse_position(event)[1])/33;
        }
      }


    make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { this.key_triggered_button( "View scene",  [ "0" ], () => this.attached = () => this.initial_camera_location );
        this.new_line();
        //super.make_control_panel();
      }

    update_state( dt )
      {               // update_state():  Override the base time-stepping code to say what this particular
                      // scene should do to its bodies every frame -- including applying forces.
                      // Generate additional moving bodies if there ever aren't enough:
        let mouse_vel = (this.mouseY - this.last_mouseY)/(dt*10);

        //console.log(this.bodies.length);
        if( this.bodies.length === 0 ) {
          this.bodies.push( new Body( this.shapes.hoop, this.materials.hoop, vec3( 1.3,1.15,1.3 )).emplace(  this.hoop_transform, vec3(0,0,0), 0));
        }

        if( this.launch === true && this.bodies.length < 2 ) {
          let bt = this.ball_transform;
          this.bodies.push( new Body( this.shapes.sphere4, this.materials.ball, vec3( 1,1,1 ) ).emplace( bt, vec3(0, 3, -4.5), 0.5, vec3(1, 0, 0) ));
        }

        // move ball based on velocity
        let b = this.bodies[1];
        if( b )
        {                                         // Gravity on Earth, where 1 unit in world space = 1 meter:
          b.linear_velocity[1] += dt * -0.8;
                                                // If about to fall through floor, reverse y velocity:
          if( b.center[1] < 1 && b.linear_velocity[1] < 0 ) {
            // Dampen y velocity and angular velocity
            b.linear_velocity[1] *= -0.8;
            b.angular_velocity *= 0.8;
          }

          if( b.center[2] < -34 && b.linear_velocity[2] < 0 ) {
            // Dampen z velocity and angular velocity  
            b.linear_velocity[2] *= -0.8;
          }

        }
        this.last_mouseX = this.mouseX;
        this.last_mouseY = this.mouseY;
      }


    display( context, program_state )
      { 
        super.display( context, program_state )
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
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
          this.mouse_enabled_canvases.add( context.canvas );
          //program_state.set_camera( Mat4.look_at( vec3( 0,9,17 ), vec3( 0,5,-20 ), vec3( 0,1,0 ) ));
        }


        // Draw the basketball      // z = -23.5 is where the hoop's center is located
        if ( this.mouseY >= 0 ) 
        {
          this.ball_transform = Mat4.translation(0 + this.mouseX, 1 + this.mouseY, -5);
        }
        else    // Cannot drag the ball below the floor
        {
          this.ball_transform = Mat4.translation(0 + this.mouseX, 1, -5);
        }
        if (this.launch === false) {
          this.bodies = [];
          this.shapes.sphere4.draw( context, program_state, this.ball_transform, this.materials.ball );
        }

        
        // Draw the basketball hoop
        this.hoop_transform = Mat4.translation(0,15.35,-23.5);//.times(Mat4.scale( 1.3,1.15,1.3 ));
        //this.shapes.hoop.draw( context, program_state, hoop_transform, this.materials.hoop );

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