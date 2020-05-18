window.Basketball_Scene = window.classes.Basketball_Scene =
class Basketball_Scene extends Scene_Component
  { constructor( context, control_box )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { super(   context, control_box );    // First, include a secondary Scene that provides movement controls:
        if( !context.globals.has_controls   ) 
          context.register_scene_component( new Movement_Controls( context, control_box.parentElement.insertCell() ) ); 

        context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,9,25 ), Vec.of( 0,9,0 ), Vec.of( 0,1,0 ) );//Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );
        this.initial_camera_location = Mat4.inverse( context.globals.graphics_state.camera_transform );

        const r = context.width/context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );

        const shapes = { 
                         sphere4: new Subdivision_Sphere( 4 ),
                         board: new Cube(),
                         text: new Text_Line(10)
                       }

        this.submit_shapes( context, shapes );
                                     
                                     // Make some Material objects available to you:
        this.materials =
          { test:     context.get_instance( Phong_Shader ).material( Color.of( 1,1,0,1 ), { ambient:.2 } ),

            ball:     context.get_instance( Phong_Shader ).material( Color.of( 1,125/255, 0, 1 ), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0  } ),

            board:    context.get_instance( Phong_Shader ).material( Color.of( 1,1,1,1 ), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0  } ),

            text_img: context.get_instance( Phong_Shader ).material( Color.of( 1,1,1,1 ), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: context.get_instance("assets/text.png", false) } ),
    
          }

        this.lights = [ new Light( Vec.of( 5,-10,5,1 ), Color.of( 0, 1, 1, 1 ), 1000 ) ];

        this.score = 0

      }

    make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { this.key_triggered_button( "View scene",  [ "0" ], () => this.attached = () => this.initial_camera_location );
        this.new_line();
//         this.key_triggered_button( "Attach to planet 1", [ "1" ], () => this.attached = () => this.planet_1 );
//         this.key_triggered_button( "Attach to planet 2", [ "2" ], () => this.attached = () => this.planet_2 ); this.new_line();
//         this.key_triggered_button( "Attach to planet 3", [ "3" ], () => this.attached = () => this.planet_3 );
//         this.key_triggered_button( "Attach to planet 4", [ "4" ], () => this.attached = () => this.planet_4 ); this.new_line();
//         this.key_triggered_button( "Attach to planet 5", [ "5" ], () => this.attached = () => this.planet_5 );
//         this.key_triggered_button( "Attach to moon",     [ "m" ], () => this.attached = () => this.moon     );
      }

    display( graphics_state )
      { graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
        const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;

        this.shapes.sphere4.draw( graphics_state, Mat4.identity(), this.materials.ball );

        let scoreboard_transform = Mat4.identity();
        scoreboard_transform = scoreboard_transform.times(Mat4.translation( [-15.6,17.3,0] ));
        scoreboard_transform = scoreboard_transform.times(Mat4.scale( [3,2,.01] ));
        this.shapes.board.draw( graphics_state, scoreboard_transform, this.materials.board)

      }
  }
