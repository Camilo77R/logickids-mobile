Pod::Spec.new do |s|
  s.name           = 'ExpoHandTracker'
  s.version        = '1.0.0'
  s.summary        = 'MediaPipe Hand Landmarker for Expo React Native'
  s.description    = 'Custom Expo module wrapping MediaPipe Hand Landmarker for real-time hand tracking'
  s.author         = 'Logickids'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4', :tvos => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
